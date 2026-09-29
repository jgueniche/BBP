-- Session 19 (ADR-031/032): the detailed kosher module and the Jewish
-- calendar leave the product. Destructive: kosher classes, Pessah flags,
-- calendar settings, the calendar cache and the profile city are deleted.
-- Apply after 202609291200, once the session 19 code is deployed.

-- The public shopping list no longer carries the kosher grocery note.
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

alter table public.shopping_items drop column kosher_note;

alter table public.meal_plan_slots
  drop column kashrut_class,
  drop column is_fish,
  drop column has_hametz,
  drop column has_kitniyot;

alter table public.recipes
  drop column kashrut_class,
  drop column is_fish,
  drop column kashrut_confidence,
  drop column kosher_flags;

alter table public.foods
  drop column kashrut_class,
  drop column is_fish,
  drop column hametz,
  drop column kitniyot,
  drop column kosher_hint;

drop table public.jewish_calendar_cache;

alter table public.user_settings
  drop column kashrut_enabled,
  drop column jewish_calendar_enabled,
  drop column shomer_shabbat,
  drop column meat_to_dairy_wait_hours,
  drop column dairy_to_meat_wait_hours,
  drop column kitniyot,
  drop column no_fish_with_meat,
  drop column minor_fasts,
  drop column israel_calendar,
  drop column candle_offset_min;

-- The city only served candle-lighting times (data minimisation).
alter table public.profiles
  drop column city,
  drop column lat,
  drop column lng;

-- Collection colours: last old keys written by the previous code, then only
-- the pastel names.
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
alter table public.collections alter column color set default 'rose';
alter table public.collections add constraint collections_color_check check (
  color in ('rose', 'ciel', 'peche', 'menthe', 'beurre', 'lilas', 'nacre')
);
