import {
  computeCalendarDays,
  DEFAULT_CALENDAR_SETTINGS,
  type CalendarDay,
  type CalendarSettings,
} from "./engine";

export type DayJewishInfo = CalendarDay;

/** Per-day Jewish calendar info for a week (offline via hebcal). */
export function weekJewishCalendar(
  weekStart: string,
  settings: Partial<CalendarSettings> = {},
): DayJewishInfo[] {
  return computeCalendarDays(weekStart, 7, {
    ...DEFAULT_CALENDAR_SETTINGS,
    ...settings,
  });
}
