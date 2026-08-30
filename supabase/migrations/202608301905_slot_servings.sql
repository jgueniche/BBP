-- Portions eaten per slot — lets plans hit calorie targets honestly
-- (1.5 servings of couscous) instead of pretending one serving fits all.
alter table public.meal_plan_slots
  add column servings numeric(3, 2) not null default 1
    check (servings > 0 and servings <= 4);
