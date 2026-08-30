-- Per-user 12-month Jewish calendar cache (brief §10.13).
-- Rows carry a settings_hash (city + minhag options); a mismatch on read
-- triggers a full recompute, so city/minhag changes propagate lazily.

create table public.jewish_calendar_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  payload jsonb not null,
  settings_hash text not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index jewish_calendar_cache_user_date_idx
  on public.jewish_calendar_cache (user_id, date);

alter table public.jewish_calendar_cache enable row level security;
create policy "calendar_cache_all" on public.jewish_calendar_cache
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
