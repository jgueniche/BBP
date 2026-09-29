-- Session 18 (pivot, ADR-028/029): health tracking leaves the product.
-- Destructive: food journal, weights, goals, health profile, gamification and
-- progress photos are deleted. Apply after 202609291000 (sport) and only once
-- the code without health tracking is deployed (it no longer reads these).

-- Gamification (built on the journal and the weight trend).
drop function if exists public.challenge_totals(text);
drop table public.challenge_participants;
drop table public.challenges;
drop table public.user_badges;
drop table public.badges;
drop table public.streaks;
drop table public.notifications;

-- Food journal and weight tracking.
drop table public.food_favorites;
drop table public.food_logs;
drop table public.tdee_proposals;
drop table public.body_measurements;
drop table public.weight_logs;
drop table public.goals;
drop table public.health_profile;

-- Private progress photos (objects first, then the bucket and its policies).
drop policy if exists "progress_photos_select_own" on storage.objects;
drop policy if exists "progress_photos_insert_own" on storage.objects;
drop policy if exists "progress_photos_delete_own" on storage.objects;
delete from storage.objects where bucket_id = 'progress-photos';
delete from storage.buckets where id = 'progress-photos';

-- Profile data that only served the calorie maths or the levels.
alter table public.profiles
  drop column gender,
  drop column birth_year,
  drop column height_cm,
  drop column level,
  drop column xp;
alter table public.user_settings drop column mode;

-- Cooking rules are opt-in for everyone new: no cultural default (ADR-029).
alter table public.user_settings
  alter column kashrut_enabled set default false,
  alter column jewish_calendar_enabled set default false,
  alter column shomer_shabbat set default false;
