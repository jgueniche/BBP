-- Session 9: weekly meal plans (kosher-validated) and shopping lists.

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  share_token uuid not null unique default gen_random_uuid(),
  generation_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.meal_plans enable row level security;

create policy "meal_plans_all" on public.meal_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger meal_plans_updated_at before update on public.meal_plans
  for each row execute function public.set_updated_at();

-- Slots snapshot the recipe facts the validator and the UI need, so a later
-- recipe edit never silently changes an already-validated plan.
create table public.meal_plan_slots (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.meal_plans(id) on delete cascade,
  date date not null,
  meal text not null check (meal in ('petit_dej', 'dej', 'diner')),
  recipe_id uuid references public.recipes(id) on delete set null,
  title text not null,
  icon text,
  kashrut_class text check (kashrut_class in ('bassari', 'halavi', 'parve')),
  is_fish boolean not null default false,
  kcal numeric(7, 1),
  protein_g numeric(6, 1),
  time_min int,
  has_hametz boolean not null default false,
  has_kitniyot boolean not null default false,
  tags text[] not null default '{}',
  is_leftover boolean not null default false,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (plan_id, date, meal)
);

create index meal_plan_slots_plan_idx on public.meal_plan_slots (plan_id, date);

alter table public.meal_plan_slots enable row level security;

create policy "meal_plan_slots_all" on public.meal_plan_slots
  for all using (
    exists (
      select 1 from public.meal_plans p
      where p.id = plan_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.meal_plans p
      where p.id = plan_id and p.user_id = auth.uid()
    )
  );

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.meal_plans(id) on delete cascade,
  label text not null,
  grams numeric(8, 1),
  aisle text not null default 'Autres',
  kosher_note boolean not null default false,
  checked boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index shopping_items_plan_idx on public.shopping_items (plan_id, aisle, position);

alter table public.shopping_items enable row level security;

create policy "shopping_items_all" on public.shopping_items
  for all using (
    exists (
      select 1 from public.meal_plans p
      where p.id = plan_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.meal_plans p
      where p.id = plan_id and p.user_id = auth.uid()
    )
  );

-- Read-only shopping list for the public share page (token = capability).
create or replace function public.shopping_list_by_token(token uuid)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'week_start', p.week_start,
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'label', s.label,
            'grams', s.grams,
            'aisle', s.aisle,
            'kosher_note', s.kosher_note,
            'checked', s.checked
          )
          order by s.aisle, s.position
        )
        from shopping_items s
        where s.plan_id = p.id
      ),
      '[]'::jsonb
    )
  )
  from meal_plans p
  where p.share_token = token;
$$;
