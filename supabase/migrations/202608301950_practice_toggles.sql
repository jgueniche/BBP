-- Observance is personal: kosher rules and the Jewish calendar each become
-- opt-out. Both default to on to preserve existing behavior.
alter table public.user_settings
  add column kashrut_enabled boolean not null default true,
  add column jewish_calendar_enabled boolean not null default true;
