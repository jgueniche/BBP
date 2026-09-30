-- Local test bench: the parts of a Supabase project our migrations rely on,
-- on a plain Postgres 16. Idempotent. Not a migration: never run in prod.
-- When @supabase/lite has bootstrapped the database first (app bench), its
-- own auth and storage tables are kept; only what is missing is added.

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

alter role service_role bypassrls;

create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;
create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);

-- Minimal auth.users (the app bench gets lite's full table instead).
create table if not exists auth.users (
  id uuid primary key,
  email varchar(255),
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Same claims as hosted Supabase: the legacy per-claim settings first, then
-- the JSON claims (what the RLS test scripts set).
create or replace function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text;
$$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;

create table if not exists storage.buckets (
  id text not null primary key,
  name text not null unique,
  owner uuid,
  owner_id text,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists storage.objects (
  id uuid not null default gen_random_uuid() primary key,
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  owner_id text,
  metadata jsonb,
  user_metadata jsonb,
  path_tokens text[] generated always as (string_to_array(name, '/')) stored,
  version text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(),
  unique (bucket_id, name)
);

alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;

create or replace function storage.foldername(name text) returns text[]
language plpgsql immutable as $$
declare
  _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end
$$;

-- Privileges as on Supabase: API roles use the schemas, RLS decides rows.
grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant select on auth.users to service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
