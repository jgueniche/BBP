import { HDate, HebrewCalendar, Location, flags } from "@hebcal/core";

// Basic v1 context (full calendar engine lands in session 13).
// Without profile coordinates we fall back to Paris for candle times.
const PARIS = new Location(
  48.8566,
  2.3522,
  false,
  "Europe/Paris",
  "Paris",
  "FR",
);

export type CalendarContext = {
  text: string;
  isFastToday: boolean;
};

function frDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(date);
}

function frTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function buildCalendarContext(
  now: Date = new Date(),
  options: { il?: boolean; location?: Location } = {},
): CalendarContext {
  const location = options.location ?? PARIS;
  const timeZone = location.getTzid();
  const il = options.il ?? false;

  const end = new Date(now.getTime() + 3 * 86_400_000);
  const events = HebrewCalendar.calendar({
    start: now,
    end,
    location,
    candlelighting: true,
    il,
    noMinorFast: false,
  });

  const hd = new HDate(now);
  const lines: string[] = [
    `Aujourd'hui : ${frDate(now, timeZone)} (${hd.renderGematriya()})`,
  ];

  let isFastToday = false;
  const todayKey = now.toDateString();

  for (const ev of events) {
    const evDate = ev.getDate().greg();
    const sameDay = evDate.toDateString() === todayKey;
    const mask = ev.getFlags();

    if (mask & flags.MAJOR_FAST || mask & flags.MINOR_FAST) {
      if (sameDay) {
        isFastToday = true;
        lines.push(
          `JEÛNE AUJOURD'HUI (${ev.render("fr")}) : aucun objectif calorique, conseils hydratation avant/après uniquement.`,
        );
      } else {
        lines.push(
          `Jeûne à venir : ${ev.render("fr")} (${frDate(evDate, timeZone)}).`,
        );
      }
      continue;
    }

    const timed = ev as { eventTime?: Date };
    if (ev.getDesc() === "Candle lighting" && timed.eventTime) {
      lines.push(
        `Allumage des bougies ${frDate(evDate, timeZone)} à ${frTime(timed.eventTime, timeZone)}.`,
      );
      continue;
    }
    if (ev.getDesc() === "Havdalah" && timed.eventTime) {
      lines.push(
        `Sortie de chabbat ${frDate(evDate, timeZone)} à ${frTime(timed.eventTime, timeZone)}.`,
      );
      continue;
    }

    if (mask & flags.CHAG || mask & flags.EREV) {
      lines.push(
        `${sameDay ? "Aujourd'hui" : frDate(evDate, timeZone)} : ${ev.render("fr")}.`,
      );
    }
  }

  return { text: lines.join(" "), isFastToday };
}
