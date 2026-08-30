import { HebrewCalendar } from "@hebcal/core";

import { DEFAULT_CALENDAR_SETTINGS, type CalendarSettings } from "./engine";
import { resolveLocation } from "./locations";

/**
 * Automatic quiet hours (brief §4.11): between candle lighting and havdalah
 * (chabbat and yom tov alike) no notification leaves the building. Honors the
 * profile city, Israel option and candle offset when provided.
 */
export function isQuietTime(
  now: Date,
  settings: Partial<CalendarSettings> = {},
): boolean {
  const full = { ...DEFAULT_CALENDAR_SETTINGS, ...settings };
  const resolved = resolveLocation(full.city);
  const start = new Date(now.getTime() - 4 * 86_400_000);
  const end = new Date(now.getTime() + 4 * 86_400_000);

  const events = HebrewCalendar.calendar({
    start,
    end,
    location: resolved.location,
    candlelighting: true,
    candleLightingMins: full.candleOffsetMin,
    il: full.israelCalendar || resolved.inIsrael,
  });

  // Latest lighting/havdalah boundary at or before `now` decides the state.
  let latest: { time: number; quietStarts: boolean } | null = null;
  for (const ev of events) {
    const timed = ev as { eventTime?: Date };
    if (!timed.eventTime) continue;
    const desc = ev.getDesc();
    if (desc !== "Candle lighting" && desc !== "Havdalah") continue;
    const time = timed.eventTime.getTime();
    if (time <= now.getTime() && (latest === null || time > latest.time)) {
      latest = { time, quietStarts: desc === "Candle lighting" };
    }
  }
  return latest?.quietStarts ?? false;
}
