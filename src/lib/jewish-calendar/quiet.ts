import { HebrewCalendar, Location } from "@hebcal/core";

const PARIS = new Location(
  48.8566,
  2.3522,
  false,
  "Europe/Paris",
  "Paris",
  "FR",
);

/**
 * Automatic quiet hours (brief §4.11): between candle lighting and havdalah
 * (chabbat and yom tov alike) no notification leaves the building.
 */
export function isQuietTime(
  now: Date,
  options: { il?: boolean; location?: Location } = {},
): boolean {
  const location = options.location ?? PARIS;
  const start = new Date(now.getTime() - 4 * 86_400_000);
  const end = new Date(now.getTime() + 4 * 86_400_000);

  const events = HebrewCalendar.calendar({
    start,
    end,
    location,
    candlelighting: true,
    il: options.il ?? false,
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
