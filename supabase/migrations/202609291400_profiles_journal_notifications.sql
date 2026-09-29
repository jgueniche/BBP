-- Session 21 (ADR-034): public profiles, follows, the cooking journal, the
-- « À cuisiner » list and sober notifications. Additive: it can run before or
-- after 202609291210, with the session 21 deployment.

-- ---------------------------------------------------------------------------
-- Profiles: a chosen @handle, a short bio and an optional photo.
-- ---------------------------------------------------------------------------
-- The app never wrote these fields before: values outside the new rules can
-- only come from elsewhere and are cleared so every check holds.
update public.profiles set username = null
where username is not null
  and (username !~ '^[a-z0-9_][a-z0-9_.]{1,28}[a-z0-9_]$' or username ~ '\.\.');
update public.profiles set display_name = null
where display_name is not null and char_length(btrim(display_name)) = 0;
update public.profiles set display_name = left(display_name, 40)
where char_length(display_name) > 40;
update public.profiles set bio = left(bio, 160) where char_length(bio) > 160;
update public.profiles set avatar_url = null
where avatar_url is not null
  and avatar_url !~ ('^' || id::text || '/[0-9a-f-]{36}\.jpg$');

alter table public.profiles
  add constraint profiles_username_format check (
    username is null
    or (username ~ '^[a-z0-9_][a-z0-9_.]{1,28}[a-z0-9_]$' and username !~ '\.\.')
  ),
  add constraint profiles_display_name_length check (
    display_name is null or char_length(display_name) between 1 and 40
  ),
  add constraint profiles_bio_length check (
    bio is null or char_length(bio) <= 160
  ),
  -- The photo is a path in the person's own folder of the photo bucket.
  add constraint profiles_avatar_path check (
    avatar_url is null or avatar_url ~ ('^' || id::text || '/[0-9a-f-]{36}\.jpg$')
  );

-- Profile photos: public bucket, one folder per person, re-encoded in the
-- browser (no EXIF, no geolocation), 1 MB at most.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 1048576, array['image/jpeg'])
on conflict (id) do nothing;

create policy "profile_photos_select_own" on storage.objects
  for select to authenticated using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "profile_photos_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "profile_photos_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- The Storage API reads the rows it lists or removes: without this policy
-- people could not delete their own post photos (post or account deletion).
create policy "post_photos_select_own" on storage.objects
  for select to authenticated using (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Follows: blocked people cannot follow back, anyone can remove a follower.
-- ---------------------------------------------------------------------------
create or replace function public.has_blocked_me(uid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from blocks where blocker_id = uid and blocked_id = auth.uid()
  );
$$;

drop policy "follows_insert" on public.follows;
create policy "follows_insert" on public.follows
  for insert with check (
    follower_id = auth.uid() and not public.has_blocked_me(followed_id)
  );

drop policy "follows_delete" on public.follows;
create policy "follows_delete" on public.follows
  for delete using (follower_id = auth.uid() or followed_id = auth.uid());

-- Counters of a public profile (or one's own). Follower lists stay private:
-- only the two people of a follow can read its row.
create or replace function public.profile_counts(uid uuid)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'followers', (select count(*) from follows f where f.followed_id = p.id),
    'following', (select count(*) from follows f where f.follower_id = p.id),
    'recipes', (
      select count(*) from recipes r
      where r.author_id = p.id and r.visibility = 'community' and r.status = 'published'
    ),
    'cooked', (
      select count(*) from posts po
      where po.author_id = p.id
        and po.kind = 'cooked'
        and po.visibility = 'community'
        and po.moderation <> 'blocked'
        and (
          po.group_id is null
          or exists (
            select 1 from groups g where g.id = po.group_id and g.visibility = 'public'
          )
        )
    )
  )
  from profiles p
  where p.id = uid and (p.visibility = 'public' or p.id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Cooking journal: every « J'ai cuisiné », private; sharing adds a post.
-- ---------------------------------------------------------------------------
create table public.cook_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- The entry outlives a deleted recipe: its title is kept.
  recipe_id uuid references public.recipes(id) on delete set null,
  recipe_title text not null check (char_length(recipe_title) between 1 and 200),
  cooked_on date not null default current_date check (cooked_on >= date '2000-01-01'),
  note text check (note is null or char_length(note) <= 1000),
  post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cook_logs_user_idx on public.cook_logs (user_id, cooked_on desc, created_at desc);
create index cook_logs_recipe_idx on public.cook_logs (recipe_id);
create index cook_logs_post_idx on public.cook_logs (post_id) where post_id is not null;

alter table public.cook_logs enable row level security;

create policy "cook_logs_select_own" on public.cook_logs
  for select using (user_id = auth.uid());
create policy "cook_logs_insert_own" on public.cook_logs
  for insert with check (
    user_id = auth.uid()
    and recipe_id is not null
    and exists (select 1 from public.recipes r where r.id = recipe_id)
    and (
      post_id is null
      or exists (
        select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()
      )
    )
  );
create policy "cook_logs_update_own" on public.cook_logs
  for update using (user_id = auth.uid()) with check (
    user_id = auth.uid()
    and (
      post_id is null
      or exists (
        select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()
      )
    )
  );
create policy "cook_logs_delete_own" on public.cook_logs
  for delete using (user_id = auth.uid());

create trigger cook_logs_updated_at before update on public.cook_logs
  for each row execute function public.set_updated_at();

-- Existing « j'ai cuisiné » posts open the journal of their authors.
insert into public.cook_logs
  (user_id, recipe_id, recipe_title, cooked_on, note, post_id, created_at, updated_at)
select
  p.author_id,
  p.recipe_id,
  left(r.title, 200),
  (p.created_at at time zone 'Europe/Paris')::date,
  p.text,
  p.id,
  p.created_at,
  p.created_at
from public.posts p
join public.recipes r on r.id = p.recipe_id
where p.kind = 'cooked'
  and not exists (select 1 from public.cook_logs l where l.post_id = p.id);

-- « Cuisinée N fois »: every journal entry counts, anonymously, for the
-- recipes the caller can see (same rule as the recipes_select_visible policy).
create or replace function public.recipe_cook_counts(recipe_ids uuid[])
returns table (recipe_id uuid, cooked bigint, cooks bigint)
language sql stable security definer
set search_path = public
as $$
  select l.recipe_id, count(*), count(distinct l.user_id)
  from cook_logs l
  join recipes r on r.id = l.recipe_id
  where l.recipe_id = any(recipe_ids)
    and cardinality(recipe_ids) <= 500
    and (
      (r.visibility = 'community' and r.status = 'published')
      or r.author_id = auth.uid()
      or public.can_view_via_collection(r.id)
    )
  group by l.recipe_id;
$$;

-- ---------------------------------------------------------------------------
-- « À cuisiner »: filled by imports and by hand, emptied by the journal.
-- ---------------------------------------------------------------------------
create table public.to_cook (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  source text not null default 'manual' check (source in ('manual', 'import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

create index to_cook_user_idx on public.to_cook (user_id, created_at desc);
create index to_cook_recipe_idx on public.to_cook (recipe_id);

alter table public.to_cook enable row level security;

create policy "to_cook_select_own" on public.to_cook
  for select using (user_id = auth.uid());
create policy "to_cook_insert_own" on public.to_cook
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.recipes r where r.id = recipe_id)
  );
create policy "to_cook_update_own" on public.to_cook
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "to_cook_delete_own" on public.to_cook
  for delete using (user_id = auth.uid());

create trigger to_cook_updated_at before update on public.to_cook
  for each row execute function public.set_updated_at();

-- A recipe leaves the list once it is cooked (runs as the cook, under RLS).
create or replace function public.cook_logs_leave_to_cook()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.recipe_id is not null then
    delete from to_cook where user_id = new.user_id and recipe_id = new.recipe_id;
  end if;
  return new;
end;
$$;

create trigger cook_logs_leave_to_cook after insert on public.cook_logs
  for each row execute function public.cook_logs_leave_to_cook();

-- Imports not cooked yet start the list.
insert into public.to_cook (user_id, recipe_id, source, created_at, updated_at)
select r.author_id, r.id, 'import', r.created_at, r.created_at
from public.recipes r
where r.author_id is not null
  and r.source_url is not null
  and r.parent_recipe_id is null
  and not exists (
    select 1 from public.cook_logs l
    where l.user_id = r.author_id and l.recipe_id = r.id
  )
on conflict (user_id, recipe_id) do nothing;

-- ---------------------------------------------------------------------------
-- Notifications, computed when read from what happened (no stored copy:
-- deletions, moderation and blocks apply at once). Invoker rights: RLS
-- decides what the caller may see.
-- ---------------------------------------------------------------------------
alter table public.user_settings
  add column notifications_seen_at timestamptz,
  add column push_sent_on date,
  add column push_sent_count smallint not null default 0
    check (push_sent_count between 0 and 100);

create index if not exists posts_recipe_idx on public.posts (recipe_id)
  where recipe_id is not null;

create or replace function public.notification_events(since timestamptz)
returns table (
  kind text,
  actor_id uuid,
  post_id uuid,
  recipe_id uuid,
  created_at timestamptz
)
language sql stable security invoker
set search_path = public
as $$
  select e.kind, e.actor_id, e.post_id, e.recipe_id, e.created_at
  from (
    select 'follow'::text as kind, f.follower_id as actor_id,
      null::uuid as post_id, null::uuid as recipe_id, f.created_at
    from follows f
    where f.followed_id = auth.uid() and f.created_at > since
    union all
    select 'reaction', r.user_id, r.post_id, null, r.created_at
    from post_reactions r
    join posts p on p.id = r.post_id
    where p.author_id = auth.uid()
      and r.user_id <> auth.uid()
      and r.created_at > since
    union all
    select 'comment', c.author_id, c.post_id, null, c.created_at
    from post_comments c
    join posts p on p.id = c.post_id
    where p.author_id = auth.uid()
      and c.author_id <> auth.uid()
      and c.moderation = 'ok'
      and c.created_at > since
    union all
    select 'cooked', p.author_id, p.id, p.recipe_id, p.created_at
    from posts p
    join recipes r on r.id = p.recipe_id
    where r.author_id = auth.uid()
      and p.author_id <> auth.uid()
      and p.kind = 'cooked'
      and p.visibility = 'community'
      and p.moderation = 'ok'
      and p.created_at > since
    union all
    select 'tip', t.user_id, null, t.recipe_id, t.created_at
    from recipe_comments t
    join recipes r on r.id = t.recipe_id
    where r.author_id = auth.uid()
      and t.user_id <> auth.uid()
      and t.moderation = 'ok'
      and t.created_at > since
  ) e
  where not exists (
    select 1 from blocks b
    where b.blocker_id = auth.uid() and b.blocked_id = e.actor_id
  )
  order by e.created_at desc
  limit 300;
$$;

-- Unread groups since the inbox was last opened (30 days at most). Groups:
-- all new followers together, then per post (reactions, comments) and per
-- recipe (« j'ai cuisiné », tips).
create or replace function public.unread_notification_count()
returns integer
language sql stable security invoker
set search_path = public
as $$
  select count(distinct e.kind || ':' || coalesce(
    (case
      when e.kind in ('cooked', 'tip') then e.recipe_id
      when e.kind = 'follow' then null
      else e.post_id
    end)::text,
    ''
  ))::integer
  from public.notification_events(
    greatest(
      coalesce(
        (select s.notifications_seen_at from public.user_settings s
         where s.user_id = auth.uid()),
        '-infinity'::timestamptz
      ),
      now() - interval '30 days'
    )
  ) e;
$$;

-- ---------------------------------------------------------------------------
-- Key indicator (admins only): imported recipes their importer cooked.
-- ---------------------------------------------------------------------------
create or replace function public.import_cook_rate()
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    return null;
  end if;
  select jsonb_build_object(
    'imported', count(*),
    'cooked', count(*) filter (where cooked),
    'imported_30d', count(*) filter (where recent),
    'cooked_30d', count(*) filter (where recent and cooked)
  )
  into result
  from (
    select
      r.created_at > now() - interval '30 days' as recent,
      exists (
        select 1 from cook_logs l
        where l.recipe_id = r.id and l.user_id = r.author_id
      ) as cooked
    from recipes r
    where r.author_id is not null
      and r.source_url is not null
      and r.parent_recipe_id is null
  ) imported;
  return result;
end;
$$;
