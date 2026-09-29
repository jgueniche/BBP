-- Session 19 (ADR-031/032): simple cooking rules, world cuisines.
-- Additive: apply with the session 19 deployment, before 202609291210.

-- Cooking rules are opt-in and private. Diets and allergies reveal beliefs or
-- health (GDPR art. 9): they can only be stored after an explicit consent.
-- Kosher settings from before session 19 are not carried over (no consent).
alter table public.user_settings
  add column diets text[] not null default '{}',
  add column allergens text[] not null default '{}',
  add column dislikes text[] not null default '{}',
  add column food_rules_consent_at timestamptz;

alter table public.user_settings
  add constraint user_settings_diets_check check (
    diets <@ array[
      'vegetarian', 'vegan', 'pescatarian', 'no_pork', 'no_alcohol',
      'halal', 'kosher', 'gluten_free', 'lactose_free'
    ]::text[]
  ),
  add constraint user_settings_allergens_check check (
    allergens <@ array[
      'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soy', 'milk',
      'tree_nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin',
      'molluscs'
    ]::text[]
  ),
  add constraint user_settings_dislikes_check check (cardinality(dislikes) <= 20),
  add constraint user_settings_food_rules_consent_check check (
    food_rules_consent_at is not null
    or (cardinality(diets) = 0 and cardinality(allergens) = 0)
  );

-- World cuisines. Existing values stay valid: the starter recipes are kept
-- as they are (Jeremy, 29/09/2026).
alter table public.recipes drop constraint recipes_origin_check;
alter table public.recipes add constraint recipes_origin_check check (
  origin in (
    'france', 'italie', 'espagne', 'portugal', 'grece', 'europe_est',
    'turquie', 'liban', 'israel', 'maroc', 'algerie', 'tunisie',
    'afrique_ouest', 'etats_unis', 'mexique', 'antilles', 'amerique_sud',
    'inde', 'chine', 'japon', 'coree', 'vietnam', 'thailande',
    'ashkenaze', 'autre'
  )
);

-- Wider categories (the « kemia » key keeps meaning « Apéro »).
alter table public.recipes drop constraint recipes_category_check;
alter table public.recipes add constraint recipes_category_check check (
  category in (
    'kemia', 'petit_dej', 'entree', 'soupe', 'salade', 'plat',
    'accompagnement', 'dessert', 'pain', 'boisson', 'sauce'
  )
);

-- Collection colours are named after their pastel (same colours, no more
-- kosher or BBP names). The old keys stay accepted until 202609291210 so the
-- code deployed before session 19 keeps creating collections.
alter table public.collections drop constraint collections_color_check;
update public.collections set color = case color
  when 'boutargue' then 'rose'
  when 'halavi' then 'ciel'
  when 'bassari' then 'peche'
  when 'ok' then 'menthe'
  when 'warn' then 'beurre'
  when 'parve' then 'lilas'
  when 'ink' then 'nacre'
  else color
end;
alter table public.collections add constraint collections_color_check check (
  color in (
    'rose', 'ciel', 'peche', 'menthe', 'beurre', 'lilas', 'nacre',
    'boutargue', 'halavi', 'bassari', 'ok', 'warn', 'parve', 'ink'
  )
);
