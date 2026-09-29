-- Session 22 (ADR-035): creators. Imported recipes are tied to the creator
-- they come from and to the original post; creators claim their profile,
-- see their statistics and can withdraw a post or refuse future imports.
-- Additive: it can run before the session 22 code is deployed.

-- ---------------------------------------------------------------------------
-- The original post of an import, one key per post whatever the link shape
-- (tracking parameters, short and long YouTube links, reels and posts).
-- ---------------------------------------------------------------------------
create or replace function public.recipe_source_key(url text)
returns text
language sql immutable parallel safe
as $$
  select case
    when url is null or url !~* '^https?://[^/?#]+' then null
    when url ~* '^https?://([a-z0-9-]+\.)*tiktok\.com/' and url ~ '/video/[0-9]+' then
      'tiktok:' || substring(url from '/video/([0-9]+)')
    when url ~* '^https?://([a-z0-9-]+\.)*(instagram\.com|instagr\.am)/'
      and url ~ '/(p|reel|reels|tv)/[A-Za-z0-9_-]+' then
      'instagram:' || substring(url from '/(?:p|reel|reels|tv)/([A-Za-z0-9_-]+)')
    when url ~* '^https?://([a-z0-9-]+\.)*youtube\.com/' and url ~ '[?&]v=[A-Za-z0-9_-]+' then
      'youtube:' || substring(url from '[?&]v=([A-Za-z0-9_-]+)')
    when url ~* '^https?://([a-z0-9-]+\.)*youtube\.com/(shorts|embed|live)/' then
      'youtube:' || substring(url from '/(?:shorts|embed|live)/([A-Za-z0-9_-]+)')
    when url ~* '^https?://youtu\.be/[A-Za-z0-9_-]+' then
      'youtube:' || substring(url from 'youtu\.be/([A-Za-z0-9_-]+)')
    else
      'web:'
      || regexp_replace(lower(substring(url from '^https?://([^/?#:]+)')), '^www\.', '')
      || coalesce(rtrim(substring(url from '^https?://[^/?#]+(/[^?#]*)'), '/'), '')
  end;
$$;

-- ---------------------------------------------------------------------------
-- Creators: an external account (Instagram, TikTok, YouTube) or a website.
-- Created from imports, claimed by the creator once verified.
-- ---------------------------------------------------------------------------
create table public.creators (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram', 'tiktok', 'youtube', 'web')),
  handle text not null check (handle ~ '^[a-z0-9._-]{1,100}$'),
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  profile_url text not null check (profile_url ~ '^https://'),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  verified boolean generated always as (claimed_by is not null) stored,
  imports_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, handle)
);

create index creators_claimed_by_idx on public.creators (claimed_by) where claimed_by is not null;

alter table public.creators enable row level security;

-- Public figures' public accounts: readable in the app, written only
-- through the functions below. Who claimed a profile is not readable: a
-- member with a private profile stays private (see creator_links).
create policy "creators_select" on public.creators
  for select to authenticated using (true);

revoke select on public.creators from anon, authenticated;
grant select (
  id, platform, handle, display_name, profile_url, verified,
  imports_blocked, created_at, updated_at
) on public.creators to authenticated;

create trigger creators_updated_at before update on public.creators
  for each row execute function public.set_updated_at();

-- Finds or creates the creator an import comes from.
create or replace function public.resolve_creator(
  p_platform text,
  p_handle text,
  p_display_name text,
  p_profile_url text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  if auth.uid() is null
    or p_platform not in ('instagram', 'tiktok', 'youtube', 'web')
    or p_handle !~ '^[a-z0-9._-]{1,100}$'
    or p_profile_url !~ '^https://'
  then
    return null;
  end if;
  insert into creators (platform, handle, display_name, profile_url)
  values (
    p_platform,
    p_handle,
    nullif(left(btrim(coalesce(p_display_name, '')), 80), ''),
    left(p_profile_url, 300)
  )
  on conflict (platform, handle) do nothing;
  select id into cid from creators where platform = p_platform and handle = p_handle;
  return cid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Imported recipes: creator, original post, withdrawal.
-- ---------------------------------------------------------------------------
alter table public.recipes
  add column creator_id uuid references public.creators(id) on delete set null,
  add column source_key text generated always as (public.recipe_source_key(source_url)) stored,
  add column withdrawn_at timestamptz;

alter table public.recipes
  add constraint recipes_creator_needs_source check (creator_id is null or source_url is not null),
  -- A withdrawn copy stays in its owner's book, never public again.
  add constraint recipes_withdrawn_private check (withdrawn_at is null or visibility = 'private');

create index recipes_creator_idx on public.recipes (creator_id, source_key)
  where creator_id is not null;
create index recipes_source_key_idx on public.recipes (source_key)
  where source_key is not null;

-- Members edit their recipes, not the creator link nor the withdrawal: only
-- the definer functions (run as the table owner) change them.
create or replace function public.recipes_guard_creator_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.creator_id := old.creator_id;
    new.withdrawn_at := old.withdrawn_at;
  end if;
  return new;
end;
$$;

create trigger recipes_guard_creator_fields before update on public.recipes
  for each row execute function public.recipes_guard_creator_fields();

-- The verified creator herself, or the team.
create or replace function public.can_manage_creator(cid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (select 1 from creators where id = cid and claimed_by = auth.uid());
$$;

-- The member behind a verified profile: only when her own profile is
-- public, for herself, and for the team.
create or replace function public.creator_links(p_creators uuid[], p_members uuid[])
returns table (creator_id uuid, member_id uuid)
language sql stable security definer
set search_path = public
as $$
  select c.id, c.claimed_by
  from creators c
  join profiles p on p.id = c.claimed_by
  where (c.id = any(p_creators) or c.claimed_by = any(p_members))
    and (p.visibility = 'public' or c.claimed_by = auth.uid() or public.is_admin())
  limit 500;
$$;

-- Posts a creator (or the moderation) withdrew from Copine: new imports of
-- them are refused.
create table public.creator_withdrawals (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.creators(id) on delete cascade,
  source_key text not null,
  withdrawn_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key)
);

alter table public.creator_withdrawals enable row level security;

create policy "creator_withdrawals_select" on public.creator_withdrawals
  for select using (public.can_manage_creator(creator_id));

create trigger creator_withdrawals_updated_at before update on public.creator_withdrawals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Claims: a verification code in the creator's bio (checked by the team) or
-- on the home page of her site (checked by the server).
-- ---------------------------------------------------------------------------
create table public.creator_claims (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null check (code ~ '^copine-[a-z0-9]{8}$'),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reason text check (reason is null or char_length(reason) <= 300),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index creator_claims_pending_idx on public.creator_claims (creator_id, user_id)
  where status = 'pending';
create index creator_claims_status_idx on public.creator_claims (status, created_at);

alter table public.creator_claims enable row level security;

create policy "creator_claims_select" on public.creator_claims
  for select using (user_id = auth.uid() or public.is_admin());
create policy "creator_claims_insert" on public.creator_claims
  for insert with check (
    user_id = auth.uid()
    and status = 'pending'
    and decided_by is null
    and decided_at is null
    and exists (
      select 1 from public.creators c
      where c.id = creator_id and not c.verified
    )
  );
-- The requester may only cancel her pending claim.
create policy "creator_claims_cancel" on public.creator_claims
  for update using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status = 'cancelled');

create trigger creator_claims_updated_at before update on public.creator_claims
  for each row execute function public.set_updated_at();

-- The team's decision (the reason is shown to the requester).
create or replace function public.decide_creator_claim(claim uuid, approve boolean, why text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  target record;
begin
  if not public.is_admin() then
    return false;
  end if;
  update creator_claims
  set status = case when approve then 'approved' else 'rejected' end,
      reason = nullif(left(btrim(coalesce(why, '')), 300), ''),
      decided_by = auth.uid(),
      decided_at = now()
  where id = claim and status = 'pending'
  returning creator_id, user_id into target;
  if not found then
    return false;
  end if;
  if approve then
    update creators
    set claimed_by = target.user_id, claimed_at = now()
    where id = target.creator_id and claimed_by is null;
    if not found then
      raise exception 'creator already claimed';
    end if;
    update creator_claims
    set status = 'rejected', reason = 'Profil déjà revendiqué.', decided_by = auth.uid(), decided_at = now()
    where creator_id = target.creator_id and status = 'pending';
  end if;
  return true;
end;
$$;

-- A code found on the home page of the site, checked by the server: only
-- the platform (service role) approves it, never a member.
create or replace function public.approve_site_claim(claim uuid)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  target record;
begin
  select cc.creator_id, cc.user_id into target
  from creator_claims cc
  join creators c on c.id = cc.creator_id
  where cc.id = claim
    and cc.status = 'pending'
    and c.platform = 'web'
    and c.claimed_by is null
  for update of cc, c;
  if not found then
    return false;
  end if;
  update creators set claimed_by = target.user_id, claimed_at = now()
  where id = target.creator_id;
  update creator_claims
  set status = 'approved', reason = null, decided_by = null, decided_at = now()
  where id = claim;
  update creator_claims
  set status = 'rejected', reason = 'Profil déjà revendiqué.', decided_at = now()
  where creator_id = target.creator_id and status = 'pending';
  return true;
end;
$$;

revoke execute on function public.approve_site_claim(uuid) from public, anon, authenticated;
grant execute on function public.approve_site_claim(uuid) to service_role;

-- The team can hand a profile back (claimed by mistake).
create or replace function public.release_creator(cid uuid)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return false;
  end if;
  update creators set claimed_by = null, claimed_at = null where id = cid;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- Creator controls: withdraw a post, restore it, refuse future imports.
-- ---------------------------------------------------------------------------

-- Every copy of the post becomes private and marked; its owner keeps it.
-- The creator's own recipes (her official version) are left alone.
create or replace function public.withdraw_creator_post(cid uuid, key text)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  owner uuid;
  touched integer;
begin
  if key is null or not public.can_manage_creator(cid) then
    return -1;
  end if;
  select claimed_by into owner from creators where id = cid;
  insert into creator_withdrawals (creator_id, source_key, withdrawn_by)
  values (cid, key, auth.uid())
  on conflict (source_key) do nothing;
  update recipes
  set withdrawn_at = now(), visibility = 'private'
  where source_key = key
    and withdrawn_at is null
    and (owner is null or author_id is distinct from owner);
  get diagnostics touched = row_count;
  return touched;
end;
$$;

create or replace function public.restore_creator_post(cid uuid, key text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  if key is null or not public.can_manage_creator(cid) then
    return false;
  end if;
  delete from creator_withdrawals where source_key = key;
  -- Copies stay private: each owner chooses to share them again.
  update recipes set withdrawn_at = null where source_key = key and withdrawn_at is not null;
  return true;
end;
$$;

create or replace function public.set_creator_imports_blocked(cid uuid, blocked boolean)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.can_manage_creator(cid) then
    return false;
  end if;
  update creators set imports_blocked = coalesce(blocked, false) where id = cid;
  return found;
end;
$$;

-- Before an import: is the post withdrawn, are imports refused, is there
-- an official version by the verified creator? Her own imports (« mine »)
-- are always allowed.
create or replace function public.import_status(url text, p_platform text, p_handle text)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  with k as (select public.recipe_source_key(url) as key),
  c as (
    select id, imports_blocked, claimed_by from creators
    where platform = p_platform and handle = p_handle
  )
  select jsonb_build_object(
    'key', (select key from k),
    'withdrawn', exists (
      select 1 from creator_withdrawals w, k where w.source_key = k.key
    ),
    'blocked', coalesce((select imports_blocked from c), false),
    'mine', coalesce((select claimed_by = auth.uid() from c), false)
      or exists (
        select 1 from creators cm, k
        where cm.claimed_by = auth.uid()
          and (
            exists (select 1 from creator_withdrawals w
              where w.source_key = k.key and w.creator_id = cm.id)
            or exists (select 1 from recipes r
              where r.source_key = k.key and r.creator_id = cm.id)
          )
      ),
    'official', (
      select jsonb_build_object('slug', r.slug, 'title', r.title)
      from recipes r
      join creators cr on cr.id = r.creator_id
      , k
      where r.source_key = k.key
        and cr.claimed_by is not null
        and r.author_id = cr.claimed_by
        and r.visibility = 'community'
        and r.status = 'published'
      order by r.created_at
      limit 1
    )
  );
$$;

-- Self-service deletion (RGPD): her claims go and her profiles become
-- unclaimed; the posts she withdrew stay withdrawn, without her name.
create or replace function public.forget_creator_claims()
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  update creators set claimed_by = null, claimed_at = null where claimed_by = auth.uid();
  update creator_withdrawals set withdrawn_by = null where withdrawn_by = auth.uid();
  update creator_claims set decided_by = null where decided_by = auth.uid();
  delete from creator_claims where user_id = auth.uid();
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Clicks towards the original post: counted, never tied to a person.
-- ---------------------------------------------------------------------------
create table public.outbound_clicks (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references public.recipes(id) on delete set null,
  creator_id uuid references public.creators(id) on delete cascade,
  source_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index outbound_clicks_creator_idx on public.outbound_clicks (creator_id, source_key);

alter table public.outbound_clicks enable row level security;
-- No policy: written by log_outbound_click, read through the statistics.

create or replace function public.log_outbound_click(rid uuid)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  target record;
begin
  if auth.uid() is null then
    return null;
  end if;
  select r.id, r.source_url, r.source_key, r.creator_id into target
  from recipes r
  where r.id = rid
    and r.source_url is not null
    and (
      (r.visibility = 'community' and r.status = 'published')
      or r.author_id = auth.uid()
      or public.can_view_via_collection(r.id)
    );
  if not found then
    return null;
  end if;
  insert into outbound_clicks (recipe_id, creator_id, source_key)
  values (target.id, target.creator_id, target.source_key);
  return target.source_url;
end;
$$;

-- ---------------------------------------------------------------------------
-- Statistics: public totals for everyone, per post for the creator.
-- ---------------------------------------------------------------------------
create or replace function public.creator_public_stats(cid uuid)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'posts', (select count(distinct source_key) from recipes where creator_id = cid),
    'saved', (select count(*) from recipes where creator_id = cid)
      + (select count(*) from recipe_saves s join recipes r on r.id = s.recipe_id where r.creator_id = cid),
    'cooked', (select count(*) from cook_logs l join recipes r on r.id = l.recipe_id where r.creator_id = cid)
  );
$$;

create or replace function public.creator_post_stats(cid uuid)
returns table (
  source_key text,
  source_url text,
  title text,
  imports bigint,
  saves bigint,
  cooks bigint,
  clicks bigint,
  withdrawn boolean,
  last_import timestamptz
)
language sql stable security definer
set search_path = public
as $$
  select
    r.source_key,
    (array_agg(r.source_url order by r.created_at))[1],
    (array_agg(r.title order by r.created_at))[1],
    count(*),
    (select count(*) from recipe_saves s join recipes x on x.id = s.recipe_id
      where x.creator_id = cid and x.source_key = r.source_key),
    (select count(*) from cook_logs l join recipes x on x.id = l.recipe_id
      where x.creator_id = cid and x.source_key = r.source_key),
    (select count(*) from outbound_clicks o
      where o.creator_id = cid and o.source_key = r.source_key),
    exists (select 1 from creator_withdrawals w where w.source_key = r.source_key),
    max(r.created_at)
  from recipes r
  where r.creator_id = cid
    and r.source_key is not null
    and public.can_manage_creator(cid)
  group by r.source_key
  order by max(r.created_at) desc
  limit 200;
$$;

-- ---------------------------------------------------------------------------
-- Reports now also cover recipes and creator profiles (removal requests).
-- ---------------------------------------------------------------------------
alter table public.reports drop constraint reports_target_kind_check;
alter table public.reports add constraint reports_target_kind_check
  check (target_kind in ('post', 'comment', 'recipe', 'creator'));

-- The team's queue: each open request with the post and the creator it is
-- about, even when the copy is private (only what is needed to act).
create or replace function public.creator_removal_requests()
returns table (
  report_id uuid,
  target_kind text,
  reason text,
  created_at timestamptz,
  recipe_title text,
  source_url text,
  source_key text,
  creator_id uuid,
  creator_platform text,
  creator_handle text,
  post_withdrawn boolean
)
language sql stable security definer
set search_path = public
as $$
  select
    rp.id,
    rp.target_kind,
    rp.reason,
    rp.created_at,
    r.title,
    r.source_url,
    r.source_key,
    c.id,
    c.platform,
    c.handle,
    exists (select 1 from creator_withdrawals w where w.source_key = r.source_key)
  from reports rp
  left join recipes r on rp.target_kind = 'recipe' and r.id = rp.target_id
  left join creators c on c.id = case
    when rp.target_kind = 'creator' then rp.target_id
    else r.creator_id
  end
  where public.is_admin()
    and rp.status = 'open'
    and rp.target_kind in ('recipe', 'creator')
  order by rp.created_at
  limit 100;
$$;

-- ---------------------------------------------------------------------------
-- Existing imports are tied to their creator when the link or the credit
-- names one (same rules as src/lib/creators/identity.ts). A website is its
-- domain: no display name from a recipe author.
-- ---------------------------------------------------------------------------
create temporary table import_creators as
with src as (
  select
    r.id,
    r.source_url,
    r.source_author,
    case
      when r.source_url ~* '^https?://([a-z0-9-]+\.)*tiktok\.com/' then 'tiktok'
      when r.source_url ~* '^https?://([a-z0-9-]+\.)*(instagram\.com|instagr\.am)/' then 'instagram'
      when r.source_url ~* '^https?://(([a-z0-9-]+\.)*youtube\.com|youtu\.be)/' then 'youtube'
      else 'web'
    end as platform
  from public.recipes r
  where r.source_url ~* '^https?://[^/?#]+' and r.creator_id is null
),
ident as (
  select
    id,
    platform,
    lower(case
      when platform = 'tiktok' then coalesce(
        substring(source_url from 'tiktok\.com/@([A-Za-z0-9._]+)'),
        substring(source_author from '^@([A-Za-z0-9._]{2,24})$'))
      when platform = 'instagram' then substring(source_author from '^@?([A-Za-z0-9._]{1,30})$')
      when platform = 'youtube' then substring(source_author from '^@([A-Za-z0-9._-]{3,30})$')
      else regexp_replace(lower(substring(source_url from '^https?://([^/?#:]+)')), '^www\.', '')
    end) as handle
  from src
)
select * from ident where handle ~ '^[a-z0-9._-]{1,100}$';

insert into public.creators (platform, handle, profile_url)
select distinct on (platform, handle)
  platform,
  handle,
  case platform
    when 'instagram' then 'https://www.instagram.com/' || handle || '/'
    when 'tiktok' then 'https://www.tiktok.com/@' || handle
    when 'youtube' then 'https://www.youtube.com/@' || handle
    else 'https://' || handle
  end
from import_creators
order by platform, handle
on conflict (platform, handle) do nothing;

update public.recipes r
set creator_id = c.id
from import_creators v
join public.creators c on c.platform = v.platform and c.handle = v.handle
where r.id = v.id;

drop table import_creators;
