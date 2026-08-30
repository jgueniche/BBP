-- Session 7: recipes with linked versions/forks, ingredients bound to foods, steps.

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete cascade,
  title text not null,
  slug text not null unique,
  description text,
  origin text check (origin in ('tunisie','algerie','maroc','israel','ashkenaze','autre')),
  category text check (category in ('kemia','entree','plat','dessert','pain','boisson')),
  difficulty text check (difficulty in ('facile','moyen','difficile')),
  prep_min int check (prep_min is null or prep_min between 0 and 600),
  cook_min int check (cook_min is null or cook_min between 0 and 1440),
  servings int not null default 4 check (servings between 1 and 24),
  kashrut_class text check (kashrut_class in ('bassari','halavi','parve')),
  is_fish boolean not null default false,
  kashrut_confidence numeric(3,2),
  kosher_flags text[] not null default '{}',
  tags text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('private','famille','community')),
  version_kind text not null default 'boutargue' check (version_kind in ('boutargue','proteine')),
  parent_recipe_id uuid references public.recipes(id) on delete set null,
  source_url text,
  source_author text,
  nutrition_per_serving jsonb not null default '{}'::jsonb,
  substitutions jsonb,
  photo_paths text[] not null default '{}',
  status text not null default 'published' check (status in ('draft','published')),
  search tsvector generated always as (to_tsvector('french', coalesce(title,'') || ' ' || coalesce(description,''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_author_idx on public.recipes (author_id);
create index recipes_visibility_idx on public.recipes (visibility, status);
create index recipes_parent_idx on public.recipes (parent_recipe_id);
create index recipes_tags_idx on public.recipes using gin (tags);
create index recipes_search_idx on public.recipes using gin (search);
create index recipes_title_trgm_idx on public.recipes using gin (title gin_trgm_ops);

alter table public.recipes enable row level security;

create policy "recipes_select_visible" on public.recipes
  for select using (
    (visibility = 'community' and status = 'published')
    or author_id = auth.uid()
  );
create policy "recipes_insert_own" on public.recipes
  for insert with check (author_id = auth.uid());
create policy "recipes_update_own" on public.recipes
  for update using (author_id = auth.uid());
create policy "recipes_delete_own" on public.recipes
  for delete using (author_id = auth.uid());

create trigger recipes_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  position int not null default 0,
  food_id uuid references public.foods(id) on delete set null,
  qty numeric(8,2),
  unit text,
  grams numeric(8,2) check (grams is null or grams between 0 and 20000),
  label_raw text not null,
  section text,
  created_at timestamptz not null default now()
);

create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id, position);

alter table public.recipe_ingredients enable row level security;

create policy "recipe_ingredients_select" on public.recipe_ingredients
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and ((r.visibility = 'community' and r.status = 'published') or r.author_id = auth.uid())
    )
  );
create policy "recipe_ingredients_write" on public.recipe_ingredients
  for all using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = auth.uid())
  ) with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = auth.uid())
  );

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  position int not null default 0,
  text text not null,
  duration_sec int,
  photo_path text,
  created_at timestamptz not null default now()
);

create index recipe_steps_recipe_idx on public.recipe_steps (recipe_id, position);

alter table public.recipe_steps enable row level security;

create policy "recipe_steps_select" on public.recipe_steps
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and ((r.visibility = 'community' and r.status = 'published') or r.author_id = auth.uid())
    )
  );
create policy "recipe_steps_write" on public.recipe_steps
  for all using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = auth.uid())
  ) with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = auth.uid())
  );

-- Per-serving nutrition from ingredient grams x linked food per_100g.
create or replace function public.compute_recipe_nutrition(rid uuid)
returns jsonb
language sql stable
set search_path = public
as $$
  with sums as (
    select
      sum((f.per_100g->>'kcal')::numeric * ri.grams / 100) as kcal,
      sum((f.per_100g->>'protein_g')::numeric * ri.grams / 100) as protein_g,
      sum((f.per_100g->>'carb_g')::numeric * ri.grams / 100) as carb_g,
      sum((f.per_100g->>'fat_g')::numeric * ri.grams / 100) as fat_g,
      sum((f.per_100g->>'fiber_g')::numeric * ri.grams / 100) as fiber_g,
      sum((f.per_100g->>'sodium_mg')::numeric * ri.grams / 100) as sodium_mg
    from recipe_ingredients ri
    join foods f on f.id = ri.food_id
    where ri.recipe_id = rid and ri.grams is not null
  )
  select jsonb_strip_nulls(jsonb_build_object(
    'kcal', round(s.kcal / r.servings, 1),
    'protein_g', round(s.protein_g / r.servings, 1),
    'carb_g', round(s.carb_g / r.servings, 1),
    'fat_g', round(s.fat_g / r.servings, 1),
    'fiber_g', round(s.fiber_g / r.servings, 1),
    'sodium_mg', round(s.sodium_mg / r.servings, 1)
  ))
  from sums s, recipes r
  where r.id = rid;
$$;