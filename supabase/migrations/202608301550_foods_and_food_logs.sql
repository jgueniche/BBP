-- Session 4: foods database (Ciqual/OFF/user), food logs, favorites, search.

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('ciqual','off','user')),
  external_id text,
  name_fr text not null,
  brand text,
  category text,
  per_100g jsonb not null default '{}'::jsonb,
  kosher_hint text,
  kashrut_class text check (kashrut_class in ('bassari','halavi','parve')),
  is_fish boolean not null default false,
  hametz boolean not null default false,
  kitniyot boolean not null default false,
  user_id uuid references auth.users(id) on delete cascade,
  search tsvector generated always as (to_tsvector('french', coalesce(name_fr, '') || ' ' || coalesce(brand, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id),
  check (source <> 'user' or user_id is not null)
);

create index foods_name_trgm_idx on public.foods using gin (name_fr gin_trgm_ops);
create index foods_search_idx on public.foods using gin (search);

alter table public.foods enable row level security;

create policy "foods_select_shared_or_own" on public.foods
  for select using (source in ('ciqual','off') or user_id = auth.uid());
create policy "foods_insert_own_user_foods" on public.foods
  for insert with check (source = 'user' and user_id = auth.uid());
create policy "foods_update_own_user_foods" on public.foods
  for update using (source = 'user' and user_id = auth.uid());
create policy "foods_delete_own_user_foods" on public.foods
  for delete using (source = 'user' and user_id = auth.uid());

create trigger foods_updated_at before update on public.foods
  for each row execute function public.set_updated_at();

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  meal text not null check (meal in ('petit_dej','dej','diner','collation','chabbat_vendredi','chabbat_samedi')),
  items jsonb not null default '[]'::jsonb,
  totals jsonb not null default '{}'::jsonb,
  kashrut_class text check (kashrut_class in ('bassari','halavi','parve')),
  source text not null default 'text' check (source in ('text','photo','voice','barcode','recipe','repeat','manual')),
  raw_input text,
  photo_path text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index food_logs_user_date_idx on public.food_logs (user_id, date desc);

alter table public.food_logs enable row level security;

create policy "food_logs_all_own" on public.food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger food_logs_updated_at before update on public.food_logs
  for each row execute function public.set_updated_at();

create table public.food_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, label)
);

alter table public.food_favorites enable row level security;

create policy "food_favorites_all_own" on public.food_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Trigram + full-text food search, RLS-aware (security invoker).
create or replace function public.search_foods(q text, max_results int default 10)
returns setof public.foods
language sql stable
set search_path = public
as $$
  select f.*
  from public.foods f
  where (f.source in ('ciqual','off') or f.user_id = auth.uid())
    and (
      f.search @@ plainto_tsquery('french', q)
      or f.name_fr % q
      or f.name_fr ilike '%' || q || '%'
    )
  order by
    case when f.name_fr ilike q || '%' then 0 else 1 end,
    similarity(f.name_fr, q) desc,
    length(f.name_fr) asc
  limit greatest(1, least(max_results, 25));
$$;
