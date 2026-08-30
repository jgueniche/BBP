import { HDate, HebrewCalendar, Location, flags } from "@hebcal/core";

// Paris fallback until profile geolocation lands (session 13).
const PARIS = new Location(
  48.8566,
  2.3522,
  false,
  "Europe/Paris",
  "Paris",
  "FR",
);

export type DayJewishInfo = {
  date: string; // YYYY-MM-DD
  hebrewDate: string; // e.g. "15 Nissan 5787"
  labels: string[]; // holiday / fast names for badges
  isChag: boolean;
  isFast: boolean;
  isPessah: boolean;
  candleTime: string | null; // "HH:MM" when candle lighting falls on this day
};

function localDateString(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

/** Per-day Jewish calendar info for a week (offline via hebcal). */
export function weekJewishCalendar(
  weekStart: string,
  options: { il?: boolean; location?: Location } = {},
): DayJewishInfo[] {
  const location = options.location ?? PARIS;
  const timeZone = location.getTzid();
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 86_400_000);

  const byDate = new Map<string, DayJewishInfo>();
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(start.getTime() + i * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    byDate.set(key, {
      date: key,
      hebrewDate: new HDate(date).render("fr"),
      labels: [],
      isChag: false,
      isFast: false,
      isPessah: false,
      candleTime: null,
    });
  }

  const events = HebrewCalendar.calendar({
    start,
    end,
    location,
    candlelighting: true,
    il: options.il ?? false,
    noMinorFast: false,
  });

  for (const ev of events) {
    const key = localDateString(ev.getDate().greg(), timeZone);
    const day = byDate.get(key);
    if (!day) continue;
    const mask = ev.getFlags();
    const timed = ev as { eventTime?: Date };

    if (ev.getDesc() === "Candle lighting" && timed.eventTime) {
      day.candleTime = new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone,
      }).format(timed.eventTime);
      continue;
    }
    if (ev.getDesc() === "Havdalah") continue;

    if (mask & flags.MAJOR_FAST || mask & flags.MINOR_FAST) {
      day.isFast = true;
      day.labels.push(ev.render("fr"));
      continue;
    }
    if (mask & flags.CHAG || mask & flags.EREV) {
      if (mask & flags.CHAG) day.isChag = true;
      day.labels.push(ev.render("fr"));
    }
    const base = (ev as { basename?: () => string }).basename?.() ?? "";
    if (base === "Pesach") day.isPessah = true;
  }

  return [...byDate.values()];
}
