-- Session 3: profiles, user settings, health profile, goals, weight logs.

create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  gender text check (gender in ('femme','homme','autre')),
  birth_year int check (birth_year between 1900 and 2100),
  height_cm numeric(5,1) check (height_cm between 100 and 250),
  city text,
  lat double precision,
  lng double precision,
  timezone text not null default 'Europe/Paris',
  avatar_url text,
  bio text,
  visibility text not null default 'private' check (visibility in ('public','private')),
  level int not null default 1,
  xp int not null default 0,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_public" on public.profiles
  for select using (auth.uid() = id or visibility = 'public');
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null default 'boutargue' check (mode in ('proteine','boutargue')),
  shomer_shabbat boolean not null default false,
  meat_to_dairy_wait_hours numeric(3,1) not null default 6 check (meat_to_dairy_wait_hours in (6, 5.5, 3, 1)),
  dairy_to_meat_wait_hours numeric(3,1) not null default 0 check (dairy_to_meat_wait_hours in (0, 6)),
  no_fish_with_meat boolean not null default false,
  kitniyot boolean not null default true,
  minor_fasts boolean not null default false,
  israel_calendar boolean not null default false,
  candle_offset_min int not null default 18,
  notif_prefs jsonb not null default '{}'::jsonb,
  quiet_hours jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_all_own" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

create table public.health_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  medical_flags jsonb not null default '{}'::jsonb,
  allergies text[] not null default '{}',
  dislikes text[] not null default '{}',
  wellbeing_flag boolean not null default false,
  consent_health_data_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.health_profile enable row level security;

create policy "health_profile_all_own" on public.health_profile
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger health_profile_updated_at before update on public.health_profile
  for each row execute function public.set_updated_at();

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('perte','maintien','recomp')),
  target_weight_kg numeric(5,1) check (target_weight_kg between 30 and 400),
  weekly_rate_pct numeric(3,2) check (weekly_rate_pct is null or (weekly_rate_pct between 0.25 and 1)),
  target_date date,
  calorie_target int check (calorie_target is null or calorie_target >= 1200),
  protein_target_g int check (protein_target_g is null or protein_target_g between 0 and 500),
  activity_level text not null check (activity_level in ('sedentaire','leger','modere','actif','tres_actif')),
  tdee_estimate int,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_user_id_idx on public.goals (user_id);
create unique index goals_one_active_per_user on public.goals (user_id) where status = 'active';

alter table public.goals enable row level security;

create policy "goals_all_own" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger goals_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  weight_kg numeric(5,1) not null check (weight_kg between 20 and 500),
  trend_kg numeric(5,2),
  source text not null default 'manual' check (source in ('manual','onboarding','import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index weight_logs_user_date_idx on public.weight_logs (user_id, date desc);

alter table public.weight_logs enable row level security;

create policy "weight_logs_all_own" on public.weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger weight_logs_updated_at before update on public.weight_logs
  for each row execute function public.set_updated_at();
