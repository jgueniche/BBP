-- Session 10: exercise library, AI/deterministic programs, sessions & quick logs.

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_fr text not null,
  kind text not null default 'muscu'
    check (kind in ('muscu', 'cardio', 'mobilite', 'fonctionnel')),
  muscle_groups text[] not null default '{}',
  equipment text[] not null default '{}',
  level text not null default 'debutant'
    check (level in ('debutant', 'intermediaire', 'avance')),
  met numeric(4, 1) not null check (met between 1 and 20),
  cues text not null,
  mistakes text not null,
  created_at timestamptz not null default now()
);

create index exercises_kind_idx on public.exercises (kind, level);
create index exercises_groups_idx on public.exercises using gin (muscle_groups);
create index exercises_equipment_idx on public.exercises using gin (equipment);

alter table public.exercises enable row level security;

-- Public library: readable by everyone, written only by seeds (definer).
create policy "exercises_select_all" on public.exercises
  for select using (true);

create table public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null check (goal in ('force', 'muscle', 'perte', 'forme')),
  days_per_week int not null check (days_per_week between 1 and 6),
  equipment text not null check (equipment in ('rien', 'elastiques', 'halteres', 'salle')),
  level text not null check (level in ('debutant', 'intermediaire', 'avance')),
  duration_min int not null default 45 check (duration_min between 15 and 120),
  weeks jsonb not null default '[]'::jsonb,
  generated_by text not null default 'fallback' check (generated_by in ('ai', 'fallback')),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_programs_user_idx on public.workout_programs (user_id, status);

alter table public.workout_programs enable row level security;

create policy "workout_programs_all" on public.workout_programs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger workout_programs_updated_at before update on public.workout_programs
  for each row execute function public.set_updated_at();

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid references public.workout_programs(id) on delete set null,
  kind text not null default 'program' check (kind in ('program', 'activity')),
  label text,
  date date not null default current_date,
  week_number int check (week_number between 1 and 8),
  day_number int check (day_number between 1 and 7),
  planned jsonb,
  performed jsonb,
  duration_min int check (duration_min between 1 and 600),
  kcal_est int check (kcal_est between 0 and 5000),
  rpe int check (rpe between 1 and 10),
  notes text check (notes is null or char_length(notes) <= 1000),
  status text not null default 'done' check (status in ('in_progress', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_sessions_user_date_idx on public.workout_sessions (user_id, date desc);

alter table public.workout_sessions enable row level security;

create policy "workout_sessions_all" on public.workout_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger workout_sessions_updated_at before update on public.workout_sessions
  for each row execute function public.set_updated_at();
