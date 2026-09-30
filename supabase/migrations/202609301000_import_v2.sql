-- Session 23 (ADR-036): import v2. A job queue for imports (quotas, polite
-- reading of sites, retries), private captures read then deleted, one copy
-- of a post per member, and recipe cover photos. Additive: it can run before
-- the session 23 code is deployed (nothing here is read by older code).

-- ---------------------------------------------------------------------------
-- Import jobs: one per import, processed after the answer under the
-- member's own session (RLS), resumed by the page that follows it.
-- ---------------------------------------------------------------------------
create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('url', 'text', 'captures')),
  status text not null default 'queued' check (
    status in (
      'queued', 'running',
      -- a draft to check, a question (caption, site), a stop (the
      -- creator's wish, my own copy), a failure
      'ready', 'needs_input', 'answered', 'failed',
      'saved', 'dismissed'
    )
  ),
  source_url text check (
    source_url is null
    or (char_length(source_url) <= 500 and source_url ~* '^https?://[^/?#]+')
  ),
  source_key text generated always as (public.recipe_source_key(source_url)) stored,
  -- The site read, for the politeness rule (no « www. »).
  source_host text check (source_host is null or source_host ~ '^[a-z0-9.-]{1,253}$'),
  -- The creator's words or a pasted text: dropped as soon as they are read.
  input_text text check (input_text is null or char_length(input_text) <= 20000),
  credit text check (credit is null or char_length(credit) <= 120),
  capture_paths text[] not null default '{}' check (cardinality(capture_paths) <= 6),
  -- What the member sees: a draft, a question or a stop. Hers only.
  result jsonb check (result is null or octet_length(result::text) <= 200000),
  error text check (error is null or error ~ '^[a-z_]{1,40}$'),
  recipe_id uuid references public.recipes(id) on delete set null,
  attempts int not null default 0 check (attempts between 0 and 10),
  locked_until timestamptz,
  not_before timestamptz not null default now(),
  model text check (model is null or char_length(model) <= 60),
  prompt_version text check (prompt_version is null or char_length(prompt_version) <= 20),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index import_jobs_user_idx on public.import_jobs (user_id, created_at desc);
create index import_jobs_key_idx on public.import_jobs (user_id, source_key)
  where source_key is not null;
create index import_jobs_host_idx on public.import_jobs (source_host, created_at)
  where source_host is not null;

alter table public.import_jobs enable row level security;

-- Read by its owner; written only through the functions below (no insert,
-- update or delete policy: quotas cannot be dodged by the API).
create policy "import_jobs_select_own" on public.import_jobs
  for select to authenticated using (user_id = auth.uid());

create trigger import_jobs_updated_at before update on public.import_jobs
  for each row execute function public.set_updated_at();

-- Quotas: per day (Paris), all imports but the ones stopped before any work
-- (creator's wish, my own copy); captures (vision) have their own ceiling.
create or replace function public.import_quota()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  with mine as (
    select kind, status from import_jobs
    where user_id = auth.uid()
      and created_at >= (date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris')
  )
  select jsonb_build_object(
    'used', (select count(*) from mine where status <> 'answered'),
    'limit', 20,
    'captures_used', (select count(*) from mine where kind = 'captures' and status <> 'answered'),
    'captures_limit', 10,
    'running', (
      select count(*) from import_jobs
      where user_id = auth.uid() and status in ('queued', 'running')
        and created_at > now() - interval '1 hour'
    ),
    'running_limit', 3
  );
$$;

create or replace function public.import_capture_paths_ok(paths text[], owner uuid)
returns boolean
language sql immutable
as $$
  select coalesce(bool_and(
    owner is not null
    and p ~ ('^' || owner::text || '/[0-9a-f-]{36}\.(jpg|webp|png)$')
  ), true)
  from unnest(paths) p;
$$;

-- A new import. The same link already in progress (or waiting for me) is
-- the same job, without a second count. A site read 20 times in the last
-- minute by the whole app makes the next readers wait a little.
create or replace function public.enqueue_import(
  p_kind text,
  p_url text,
  p_text text,
  p_credit text,
  p_captures text[]
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  quota jsonb;
  key text := public.recipe_source_key(p_url);
  host text;
  existing uuid;
  recent int;
  job uuid;
begin
  if uid is null then
    return jsonb_build_object('error', 'auth');
  end if;
  if p_kind not in ('url', 'text', 'captures')
    or (p_kind = 'url' and key is null)
    or (p_kind = 'text' and (p_text is null or char_length(p_text) not between 20 and 20000))
    or (p_kind = 'captures' and (
      coalesce(cardinality(p_captures), 0) not between 1 and 6
      or not public.import_capture_paths_ok(p_captures, uid)
    ))
  then
    return jsonb_build_object('error', 'invalid');
  end if;

  if p_kind = 'url' then
    select id into existing from import_jobs
    where user_id = uid and source_key = key
      and status in ('queued', 'running', 'ready', 'needs_input')
      and created_at > now() - interval '1 day'
    order by created_at desc
    limit 1;
    if existing is not null then
      return jsonb_build_object('id', existing, 'reused', true);
    end if;
  end if;

  quota := public.import_quota();
  if (quota ->> 'used')::int >= (quota ->> 'limit')::int then
    return jsonb_build_object('error', 'quota_daily');
  end if;
  if p_kind = 'captures'
    and (quota ->> 'captures_used')::int >= (quota ->> 'captures_limit')::int
  then
    return jsonb_build_object('error', 'quota_captures');
  end if;
  if (quota ->> 'running')::int >= (quota ->> 'running_limit')::int then
    return jsonb_build_object('error', 'busy');
  end if;

  host := regexp_replace(lower(substring(p_url from '^[Hh][Tt][Tt][Pp][Ss]?://([^/?#:]+)')), '^www\.', '');
  if host is not null then
    select count(*) into recent from import_jobs
    where source_host = host and created_at > now() - interval '1 minute';
  end if;

  insert into import_jobs (user_id, kind, source_url, source_host, input_text, credit, capture_paths, not_before)
  values (
    uid, p_kind, p_url, host, p_text, nullif(btrim(p_credit), ''),
    coalesce(p_captures, '{}'),
    now() + case when coalesce(recent, 0) >= 20 then interval '30 seconds' else interval '0' end
  )
  returning id into job;

  -- Old jobs of mine go (drafts are never kept more than 30 days).
  delete from import_jobs where user_id = uid and created_at < now() - interval '30 days';

  return jsonb_build_object('id', job, 'reused', false);
end;
$$;

-- The runner takes a job for 2 minutes; an expired lease can be taken
-- again, 3 tries at most (then the job fails).
create or replace function public.claim_import_job(p_job uuid)
returns setof public.import_jobs
language plpgsql security definer
set search_path = public
as $$
begin
  update import_jobs
  set status = 'failed', error = 'timeout', finished_at = now(),
      locked_until = null, input_text = null
  where id = p_job and user_id = auth.uid()
    and status in ('queued', 'running')
    and attempts >= 3
    and (locked_until is null or locked_until < now());

  return query
  update import_jobs
  set status = 'running', attempts = attempts + 1,
      locked_until = now() + interval '2 minutes'
  where id = p_job and user_id = auth.uid()
    and not_before <= now()
    and attempts < 3
    and (status = 'queued' or (status = 'running' and locked_until < now()))
  returning *;
end;
$$;

-- The runner's outcome. The creator's text is dropped; captures were
-- deleted from storage by the runner.
create or replace function public.finish_import_job(
  p_job uuid,
  p_status text,
  p_result jsonb,
  p_error text,
  p_source_url text,
  p_model text,
  p_prompt_version text
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  if p_status not in ('ready', 'needs_input', 'answered', 'failed') then
    return false;
  end if;
  update import_jobs
  set status = p_status,
      result = p_result,
      error = p_error,
      source_url = coalesce(p_source_url, source_url),
      model = p_model,
      prompt_version = p_prompt_version,
      locked_until = null,
      finished_at = now(),
      input_text = null,
      capture_paths = '{}'
  where id = p_job and user_id = auth.uid() and status = 'running';
  return found;
end;
$$;

-- A transient failure (network, AI): back in the queue, tries kept.
create or replace function public.requeue_import_job(p_job uuid)
returns boolean
language sql security definer
set search_path = public
as $$
  update import_jobs
  set status = 'queued', locked_until = null, not_before = now() + interval '5 seconds'
  where id = p_job and user_id = auth.uid() and status = 'running'
  returning true;
$$;

-- The answer to a question (the caption, captures): the same job again,
-- counted once. Switching to captures respects their ceiling.
create or replace function public.continue_import_job(
  p_job uuid,
  p_kind text,
  p_text text,
  p_credit text,
  p_captures text[]
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  quota jsonb;
  current_kind text;
begin
  select kind into current_kind from import_jobs
  where id = p_job and user_id = uid and status = 'needs_input';
  if current_kind is null then
    return jsonb_build_object('error', 'invalid');
  end if;
  if p_kind not in ('text', 'captures')
    or (p_kind = 'text' and (p_text is null or char_length(p_text) not between 20 and 20000))
    or (p_kind = 'captures' and (
      coalesce(cardinality(p_captures), 0) not between 1 and 6
      or not public.import_capture_paths_ok(p_captures, uid)
    ))
  then
    return jsonb_build_object('error', 'invalid');
  end if;
  if p_kind = 'captures' and current_kind <> 'captures' then
    quota := public.import_quota();
    if (quota ->> 'captures_used')::int >= (quota ->> 'captures_limit')::int then
      return jsonb_build_object('error', 'quota_captures');
    end if;
  end if;
  update import_jobs
  set kind = p_kind, status = 'queued', input_text = p_text,
      credit = coalesce(nullif(btrim(p_credit), ''), credit),
      capture_paths = coalesce(p_captures, '{}'),
      result = null, error = null, attempts = 0, locked_until = null,
      not_before = now(), finished_at = null
  where id = p_job and user_id = uid;
  return jsonb_build_object('id', p_job, 'reused', true);
end;
$$;

-- Out of my list; its draft goes with it.
create or replace function public.dismiss_import_job(p_job uuid)
returns boolean
language sql security definer
set search_path = public
as $$
  update import_jobs
  set status = 'dismissed', result = null, input_text = null, locked_until = null
  where id = p_job and user_id = auth.uid() and status <> 'dismissed'
  returning true;
$$;

-- The draft became my recipe: the job keeps only the link to it.
create or replace function public.mark_import_saved(p_job uuid, p_recipe uuid)
returns boolean
language sql security definer
set search_path = public
as $$
  update import_jobs
  set status = 'saved', recipe_id = p_recipe, result = null, input_text = null
  where id = p_job and user_id = auth.uid() and status = 'ready'
    and exists (select 1 from recipes where id = p_recipe and author_id = auth.uid())
  returning true;
$$;

-- Self-service deletion (RGPD): every import job of mine.
create or replace function public.forget_import_jobs()
returns void
language sql security definer
set search_path = public
as $$
  delete from import_jobs where user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Captures: a private bucket, one folder per member, read by the job then
-- deleted (never shown, never kept, never a cover).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('import-captures', 'import-captures', false, 3145728, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;

create policy "import_captures_select_own" on storage.objects
  for select to authenticated using (
    bucket_id = 'import-captures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "import_captures_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'import-captures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "import_captures_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'import-captures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- One copy of a post per member: a second import opens the first. « Ma
-- version » and variants (parent_recipe_id) are other recipes.
-- ---------------------------------------------------------------------------
create unique index recipes_one_import_per_member on public.recipes (author_id, source_key)
  where source_key is not null and parent_recipe_id is null;

-- ---------------------------------------------------------------------------
-- Cover photos: the member's own photo (re-encoded in the browser, no
-- geolocation), in a private bucket readable as far as the recipe is. Never
-- a creator's image: imports never set one.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', false, 3145728, array['image/jpeg'])
on conflict (id) do nothing;

-- Paths live in the author's folder: pointing at someone else's photo would
-- make it readable with the recipe. One cover for now.
create or replace function public.recipe_photo_paths_ok(paths text[], owner uuid)
returns boolean
language sql immutable
as $$
  select cardinality(paths) <= 1 and coalesce(bool_and(
    owner is not null
    and p ~ ('^' || owner::text || '/[0-9a-f-]{36}\.jpg$')
  ), true)
  from unnest(paths) p;
$$;

alter table public.recipes
  add constraint recipes_photo_paths_own check (public.recipe_photo_paths_ok(photo_paths, author_id));

-- Not partial: the storage policy's « @> » would not use a partial index.
create index recipes_photo_paths_idx on public.recipes using gin (photo_paths);

-- Runs with the reader's rights: the recipes she can see decide the photos
-- she can see (a thumbnail follows its photo).
create or replace function public.recipe_photo_visible(object_name text)
returns boolean
language sql stable
set search_path = public
as $$
  select exists (
    select 1 from recipes r
    where r.photo_paths @> array[regexp_replace(object_name, '-thumb\.jpg$', '.jpg')]
  );
$$;

create policy "recipe_photos_select_visible" on storage.objects
  for select using (
    bucket_id = 'recipe-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.recipe_photo_visible(name)
    )
  );
create policy "recipe_photos_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}(-thumb)?\.jpg$'
  );
create policy "recipe_photos_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
