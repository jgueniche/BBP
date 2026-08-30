-- Session 5: body measurements, adaptive TDEE proposals, private progress photos.

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  waist_cm numeric(5,1) check (waist_cm is null or waist_cm between 30 and 300),
  hips_cm numeric(5,1) check (hips_cm is null or hips_cm between 30 and 300),
  chest_cm numeric(5,1) check (chest_cm is null or chest_cm between 30 and 300),
  arm_cm numeric(5,1) check (arm_cm is null or arm_cm between 10 and 100),
  thigh_cm numeric(5,1) check (thigh_cm is null or thigh_cm between 20 and 150),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index body_measurements_user_date_idx on public.body_measurements (user_id, date desc);

alter table public.body_measurements enable row level security;

create policy "body_measurements_all_own" on public.body_measurements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger body_measurements_updated_at before update on public.body_measurements
  for each row execute function public.set_updated_at();

create table public.tdee_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  old_tdee int not null,
  new_tdee int not null,
  old_calorie_target int,
  new_calorie_target int,
  avg_intake_kcal int not null,
  trend_change_kg numeric(5,2) not null,
  days_with_logs int not null,
  status text not null default 'pending' check (status in ('pending','accepted','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index tdee_proposals_user_idx on public.tdee_proposals (user_id, created_at desc);

alter table public.tdee_proposals enable row level security;

create policy "tdee_proposals_all_own" on public.tdee_proposals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger tdee_proposals_updated_at before update on public.tdee_proposals
  for each row execute function public.set_updated_at();

-- Private progress photos bucket; one folder per user id.
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

create policy "progress_photos_select_own" on storage.objects
  for select using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "progress_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "progress_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
