-- Session 18 (pivot, ADR-029): universal community vocabulary.
-- Reactions bsahtek / mabrouk / ya ouili become love / bravo / miam; posts are
-- « Actu » (text), « J'ai cuisiné » (cooked) or a recipe. Apply after
-- 202609291000 (which already folded workout posts into text).

-- Reactions: rename in place, then tighten the check.
alter table public.post_reactions drop constraint post_reactions_kind_check;
update public.post_reactions set kind = case kind
  when 'bsahtek' then 'love'
  when 'mabrouk' then 'bravo'
  when 'yaouili' then 'miam'
  else kind
end;
alter table public.post_reactions add constraint post_reactions_kind_check
  check (kind in ('love', 'bravo', 'miam'));

-- Post kinds: weight progress posts become plain news, chabbat plates become
-- « J'ai cuisiné ».
alter table public.posts drop constraint posts_kind_check;
update public.posts set kind = 'text' where kind = 'progress';
update public.posts set kind = 'cooked' where kind = 'shabbat_plate';
alter table public.posts add constraint posts_kind_check
  check (kind in ('text', 'recipe', 'cooked'));

-- Counters with the new reaction names (invoker RLS kept).
drop view public.post_stats;
create view public.post_stats
with (security_invoker = true) as
select
  p.id as post_id,
  (select count(*) from public.post_reactions r
     where r.post_id = p.id and r.kind = 'love') as love,
  (select count(*) from public.post_reactions r
     where r.post_id = p.id and r.kind = 'bravo') as bravo,
  (select count(*) from public.post_reactions r
     where r.post_id = p.id and r.kind = 'miam') as miam,
  (select count(*) from public.post_comments c
     where c.post_id = p.id and c.moderation <> 'blocked') as comments
from public.posts p;
