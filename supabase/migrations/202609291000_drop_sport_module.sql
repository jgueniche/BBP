-- Session 17 (pivot): the sport module leaves the product.
-- Destructive: workout programs, sessions and the exercise library are deleted.
-- Apply only once the code without sport is deployed (it no longer reads these).

-- Sport posts keep their text and become plain messages.
update public.posts set kind = 'text' where kind = 'workout';
alter table public.posts drop constraint posts_kind_check;
alter table public.posts add constraint posts_kind_check
  check (kind in ('text', 'recipe', 'progress', 'shabbat_plate'));

-- Sport streaks.
delete from public.streaks where kind = 'sport';
alter table public.streaks drop constraint streaks_kind_check;
alter table public.streaks add constraint streaks_kind_check
  check (kind in ('journal', 'pesee'));

-- Sport badges (user_badges rows cascade).
delete from public.badges where slug in ('yalla', 'marcheur-belleville');

-- Sport challenges (participants cascade) and their metrics.
delete from public.challenges where metric in ('distance_km', 'sessions');
alter table public.challenges drop constraint challenges_metric_check;
alter table public.challenges add constraint challenges_metric_check
  check (metric in ('journal_days', 'protein_recipes'));

-- Workout tables, dependents first.
drop table public.workout_sessions;
drop table public.workout_programs;
drop table public.exercises;
