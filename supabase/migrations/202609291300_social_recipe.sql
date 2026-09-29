-- Session 20: the social recipe. « J'ai cuisiné » with photos attached to the
-- recipe, tips voted « utile », free tags with reference tags (synonyms) and
-- categories. Additive: apply with the session 20 deployment.

-- ---------------------------------------------------------------------------
-- Post photos: public bucket (posts are community content), one folder per
-- user. Photos are re-encoded in the browser before upload, which drops the
-- EXIF metadata, geolocation included.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-photos', 'post-photos', true, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "post_photos_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "post_photos_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

alter table public.posts
  add constraint posts_photo_paths_check check (cardinality(photo_paths) <= 4);

-- « Cuisinée N fois »: community « j'ai cuisiné » posts per recipe (invoker
-- RLS, so blocked or private posts never count for others).
create view public.recipe_cooked_stats
with (security_invoker = true) as
select
  p.recipe_id,
  count(*) as cooked,
  count(distinct p.author_id) as cooks
from public.posts p
where p.kind = 'cooked' and p.recipe_id is not null and p.moderation <> 'blocked'
group by p.recipe_id;

-- ---------------------------------------------------------------------------
-- Tips: recipe comments become moderated tips, voted « utile ».
-- ---------------------------------------------------------------------------
alter table public.recipe_comments
  add column moderation text not null default 'ok'
    check (moderation in ('ok', 'flagged', 'blocked')),
  add column moderation_reasons text[] not null default '{}';

drop policy "recipe_comments_select" on public.recipe_comments;
create policy "recipe_comments_select" on public.recipe_comments
  for select using (
    (moderation <> 'blocked' or user_id = auth.uid())
    and exists (select 1 from public.recipes r where r.id = recipe_id)
  );

create table public.recipe_comment_votes (
  comment_id uuid not null references public.recipe_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index recipe_comment_votes_user_idx on public.recipe_comment_votes (user_id);

alter table public.recipe_comment_votes enable row level security;

create policy "recipe_comment_votes_select" on public.recipe_comment_votes
  for select using (
    exists (select 1 from public.recipe_comments c where c.id = comment_id)
  );
-- One vote per person, never on one's own tip.
create policy "recipe_comment_votes_insert" on public.recipe_comment_votes
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.recipe_comments c
      where c.id = comment_id and c.user_id <> auth.uid()
    )
  );
create policy "recipe_comment_votes_delete" on public.recipe_comment_votes
  for delete using (user_id = auth.uid());

create view public.recipe_comment_stats
with (security_invoker = true) as
select c.id as comment_id, count(v.user_id) as helpful
from public.recipe_comments c
left join public.recipe_comment_votes v on v.comment_id = c.id
group by c.id;

-- ---------------------------------------------------------------------------
-- Tags: members and creators create free tags; moderators attach synonyms to
-- a reference tag (canonical) and group tags under categories (parents),
-- like AO3. Recipes keep their tags as normalised slugs in recipes.tags.
-- ---------------------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 40),
  label text not null check (char_length(label) between 2 and 40),
  canonical_id uuid references public.tags(id) on delete set null,
  parent_id uuid references public.tags(id) on delete set null,
  reviewed boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (canonical_id is null or canonical_id <> id),
  check (parent_id is null or parent_id <> id)
);

create index tags_canonical_idx on public.tags (canonical_id);
create index tags_parent_idx on public.tags (parent_id);
create index tags_label_trgm_idx on public.tags using gin (label gin_trgm_ops);

alter table public.tags enable row level security;

create policy "tags_select" on public.tags for select using (true);
-- Anyone signed in may propose a tag; only moderation links or reviews it.
create policy "tags_insert" on public.tags
  for insert to authenticated with check (
    created_by = auth.uid()
    and canonical_id is null
    and parent_id is null
    and reviewed = false
  );
create policy "tags_update_admin" on public.tags
  for update using (public.is_admin());
create policy "tags_delete_admin" on public.tags
  for delete using (public.is_admin());

create trigger tags_updated_at before update on public.tags
  for each row execute function public.set_updated_at();

-- Existing recipe tags become reviewed reference tags.
insert into public.tags (slug, label, reviewed)
select distinct t, replace(t, '-', ' '), true
from public.recipes, unnest(tags) as t
where t ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(t) between 2 and 40
on conflict (slug) do nothing;
