-- Session 11: community feed — groups, posts, reactions, comments, follows,
-- blocks, reports, moderation and admin queue.

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
-- No policies: only security definer helpers read this table.

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null check (char_length(name) between 2 and 60),
  description text check (description is null or char_length(description) <= 300),
  icon text not null default '👥' check (char_length(icon) <= 8),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_idx on public.group_members (user_id);

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from group_members where group_id = gid and user_id = auth.uid()
  );
$$;

-- A group's feed is readable when the group is public or you belong to it.
create or replace function public.group_readable(gid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from groups g
    where g.id = gid
      and (g.visibility = 'public' or public.is_group_member(g.id))
  );
$$;

alter table public.groups enable row level security;

create policy "groups_select" on public.groups
  for select using (visibility = 'public' or public.is_group_member(id));
create policy "groups_insert" on public.groups
  for insert with check (created_by = auth.uid());
create policy "groups_update" on public.groups
  for update using (created_by = auth.uid() or public.is_admin());
create policy "groups_delete" on public.groups
  for delete using (created_by = auth.uid() or public.is_admin());

alter table public.group_members enable row level security;

create policy "group_members_select" on public.group_members
  for select using (user_id = auth.uid() or public.group_readable(group_id));
create policy "group_members_insert" on public.group_members
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.groups g
      where g.id = group_id and (g.visibility = 'public' or g.created_by = auth.uid())
    )
  );
create policy "group_members_delete" on public.group_members
  for delete using (user_id = auth.uid());

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'text'
    check (kind in ('text', 'recipe', 'progress', 'shabbat_plate', 'workout')),
  text text check (text is null or char_length(text) <= 1000),
  recipe_id uuid references public.recipes(id) on delete set null,
  photo_paths text[] not null default '{}',
  group_id uuid references public.groups(id) on delete cascade,
  visibility text not null default 'community'
    check (visibility in ('private', 'community')),
  moderation text not null default 'ok'
    check (moderation in ('ok', 'flagged', 'blocked')),
  moderation_reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_feed_idx on public.posts (created_at desc)
  where visibility = 'community' and moderation <> 'blocked';
create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_group_idx on public.posts (group_id, created_at desc);

alter table public.posts enable row level security;

-- Blocked content stays visible to its author only ("retiré").
create policy "posts_select" on public.posts
  for select using (
    (moderation <> 'blocked' or author_id = auth.uid())
    and (
      author_id = auth.uid()
      or (
        visibility = 'community'
        and (group_id is null or public.group_readable(group_id))
      )
    )
  );
create policy "posts_insert" on public.posts
  for insert with check (
    author_id = auth.uid()
    and (group_id is null or public.is_group_member(group_id))
  );
create policy "posts_update_own" on public.posts
  for update using (author_id = auth.uid());
create policy "posts_delete_own" on public.posts
  for delete using (author_id = auth.uid() or public.is_admin());

create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  moderation text not null default 'ok'
    check (moderation in ('ok', 'flagged', 'blocked')),
  moderation_reasons text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index post_comments_post_idx on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

create policy "post_comments_select" on public.post_comments
  for select using (
    (moderation <> 'blocked' or author_id = auth.uid())
    and exists (select 1 from public.posts p where p.id = post_id)
  );
create policy "post_comments_insert" on public.post_comments
  for insert with check (
    author_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_id)
  );
create policy "post_comments_delete" on public.post_comments
  for delete using (
    author_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()
    )
  );

create table public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('bsahtek', 'mabrouk', 'yaouili')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_reactions enable row level security;

create policy "post_reactions_select" on public.post_reactions
  for select using (exists (select 1 from public.posts p where p.id = post_id));
create policy "post_reactions_write" on public.post_reactions
  for all using (user_id = auth.uid()) with check (
    user_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_id)
  );

create table public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create index follows_followed_idx on public.follows (followed_id);

alter table public.follows enable row level security;

create policy "follows_select" on public.follows
  for select using (follower_id = auth.uid() or followed_id = auth.uid());
create policy "follows_insert" on public.follows
  for insert with check (follower_id = auth.uid());
create policy "follows_delete" on public.follows
  for delete using (follower_id = auth.uid());

create table public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "blocks_all" on public.blocks
  for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_kind text not null check (target_kind in ('post', 'comment')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 300),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index reports_status_idx on public.reports (status, created_at);

alter table public.reports enable row level security;

create policy "reports_select" on public.reports
  for select using (reporter_id = auth.uid() or public.is_admin());
create policy "reports_insert" on public.reports
  for insert with check (reporter_id = auth.uid());
create policy "reports_update_admin" on public.reports
  for update using (public.is_admin());

-- Reaction/comment counts, RLS-aware through the invoker.
create view public.post_stats
with (security_invoker = true) as
select
  p.id as post_id,
  (select count(*) from public.post_reactions r
     where r.post_id = p.id and r.kind = 'bsahtek') as bsahtek,
  (select count(*) from public.post_reactions r
     where r.post_id = p.id and r.kind = 'mabrouk') as mabrouk,
  (select count(*) from public.post_reactions r
     where r.post_id = p.id and r.kind = 'yaouili') as yaouili,
  (select count(*) from public.post_comments c
     where c.post_id = p.id and c.moderation <> 'blocked') as comments
from public.posts p;

-- Admin moderation action (queue at /admin/moderation).
create or replace function public.admin_set_moderation(
  target_kind text,
  target_id uuid,
  new_status text
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return false;
  end if;
  if new_status not in ('ok', 'flagged', 'blocked') then
    return false;
  end if;
  if target_kind = 'post' then
    update posts set moderation = new_status where id = target_id;
  elsif target_kind = 'comment' then
    update post_comments set moderation = new_status where id = target_id;
  else
    return false;
  end if;
  return found;
end;
$$;

-- Seed: Jeremy's accounts moderate the community.
insert into public.admin_users (user_id)
select id from auth.users
where email in ('jeremy.gueniche@gmail.com', 'jgueniche@yahoo.fr')
on conflict do nothing;
