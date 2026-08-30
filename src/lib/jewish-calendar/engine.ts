import { HDate, HebrewCalendar, flags } from "@hebcal/core";

import { resolveLocation } from "./locations";

/**
 * Unified Jewish calendar engine (brief §10.13). All per-user calendar reads
 * go through here: profile city, Israel option, minor fasts opt-in and the
 * candle-lighting offset all change the output, hence the settings hash used
 * by the cache layer.
 */
export type CalendarSettings = {
  city: string | null;
  israelCalendar: boolean;
  minorFasts: boolean;
  candleOffsetMin: number;
};

export const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  city: null,
  israelCalendar: false,
  minorFasts: false,
  candleOffsetMin: 18,
};

export type CalendarDay = {
  date: string; // YYYY-MM-DD
  hebrewDate: string;
  labels: string[]; // French display labels for badges
  holidays: string[]; // hebcal basenames, e.g. "Pesach", "Chanukah"
  isChag: boolean;
  isErev: boolean; // candle lighting tonight (erev chabbat or erev chag)
  isFast: boolean;
  fastName: string | null;
  isPessah: boolean;
  isChavouot: boolean;
  isHanouka: boolean;
  isFeast: boolean; // "budget kiff" day: joyful chag, Hanouka, Pourim
  candleTime: string | null; // "HH:MM" local
  havdalahTime: string | null; // "HH:MM" local
};

/** Tichri feast cluster used for the après-fêtes window. */
const TICHRI_BASENAMES = new Set([
  "Rosh Hashana",
  "Yom Kippur",
  "Sukkot",
  "Shmini Atzeret",
  "Simchat Torah",
]);

const MINOR_HOLIDAY_KEEP = new Set(["Chanukah", "Purim", "Tu BiShvat"]);

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Date key of an untimed hebcal event. `HDate.greg()` builds the Date with
 * local constructor fields, so reading them back with local getters is
 * correct on any server timezone (formatting via a target tz is not).
 */
function gregDateKey(greg: Date): string {
  return `${greg.getFullYear()}-${pad(greg.getMonth() + 1)}-${pad(greg.getDate())}`;
}

function localTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(instant);
}

export function computeCalendarDays(
  from: string,
  dayCount: number,
  settings: CalendarSettings,
): CalendarDay[] {
  const resolved = resolveLocation(settings.city);
  const timeZone = resolved.location.getTzid();
  const il = settings.israelCalendar || resolved.inIsrael;

  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(start.getTime() + (dayCount - 1) * 86_400_000);

  const byDate = new Map<string, CalendarDay>();
  for (let i = 0; i < dayCount; i += 1) {
    const date = new Date(start.getTime() + i * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    byDate.set(key, {
      date: key,
      hebrewDate: new HDate(
        new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      ).render("fr"),
      labels: [],
      holidays: [],
      isChag: false,
      isErev: false,
      isFast: false,
      fastName: null,
      isPessah: false,
      isChavouot: false,
      isHanouka: false,
      isFeast: false,
      candleTime: null,
      havdalahTime: null,
    });
  }

  const events = HebrewCalendar.calendar({
    start: new Date(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
    ),
    end: new Date(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
    location: resolved.location,
    candlelighting: true,
    candleLightingMins: settings.candleOffsetMin,
    il,
    noMinorFast: !settings.minorFasts,
  });

  for (const ev of events) {
    const key = gregDateKey(ev.getDate().greg());
    const day = byDate.get(key);
    if (!day) continue;

    const mask = ev.getFlags();
    const desc = ev.getDesc();
    const timed = ev as { eventTime?: Date };
    const basename = (ev as { basename?: () => string }).basename?.() ?? desc;

    if (desc === "Candle lighting" && timed.eventTime) {
      day.candleTime = localTime(timed.eventTime, timeZone);
      day.isErev = true;
      continue;
    }
    if (desc === "Havdalah" && timed.eventTime) {
      day.havdalahTime = localTime(timed.eventTime, timeZone);
      continue;
    }

    // Timed fast boundaries emitted alongside a location — not day-level info.
    if (desc === "Fast begins" || desc === "Fast ends") continue;

    const isFastEvent = Boolean(mask & (flags.MAJOR_FAST | flags.MINOR_FAST));
    const isErevEvent = desc.startsWith("Erev");
    const isChagEvent = Boolean(mask & flags.CHAG);
    const isCholHamoed = Boolean(mask & flags.CHOL_HAMOED);
    const isMinorKeep =
      Boolean(mask & flags.MINOR_HOLIDAY) && MINOR_HOLIDAY_KEEP.has(basename);

    const relevant =
      (isFastEvent && !isErevEvent) ||
      isChagEvent ||
      isCholHamoed ||
      isErevEvent ||
      isMinorKeep;
    if (!relevant) continue;

    // Kippour is both: a chag AND a fast. Erev Tish'a B'Av carries the fast
    // flag but its daytime is normal — the fast only starts at sundown.
    if (isFastEvent && !isErevEvent) {
      day.isFast = true;
      day.fastName = ev.render("fr");
    }
    if (isChagEvent) day.isChag = true;
    if (isChagEvent || isCholHamoed || isMinorKeep) {
      day.holidays.push(basename);
    } else if (isErevEvent) {
      day.holidays.push(basename.replace(/^Erev /, ""));
    }
    day.labels.push(ev.render("fr"));

    // Erev Pesach counts for the hametz filter (restricted from mid-morning);
    // Pesach Sheni has its own basename and stays out.
    if (basename === "Pesach" || desc === "Erev Pesach") day.isPessah = true;
    if (basename === "Shavuot") day.isChavouot = true;
    if (basename === "Chanukah") day.isHanouka = true;
  }

  for (const day of byDate.values()) {
    day.isFeast =
      (day.isChag && !day.isFast) ||
      day.isHanouka ||
      day.holidays.includes("Purim");
  }

  return [...byDate.values()];
}

export type PostFeastWindow = {
  feast: "tichri" | "pessah" | "hanouka";
  endedOn: string; // last feast date (YYYY-MM-DD)
};

function feastKindOf(day: CalendarDay): PostFeastWindow["feast"] | null {
  if (day.isPessah && day.isChag) return "pessah";
  if (day.isHanouka) return "hanouka";
  if (day.holidays.some((h) => TICHRI_BASENAMES.has(h)) && day.isChag) {
    return "tichri";
  }
  return null;
}

/**
 * Ends of the big feast periods (Tichri cluster, Pessah, Hanouka) inside the
 * given days — the après-fêtes gentle-reset week starts the day after each.
 */
export function feastEnds(days: CalendarDay[]): PostFeastWindow[] {
  const ends: PostFeastWindow[] = [];
  for (let i = 0; i < days.length; i += 1) {
    const kind = feastKindOf(days[i]);
    if (kind === null) continue;
    // 12-day look-ahead: the Tichri cluster has gaps (Roch Hachana → Kippour
    // is 8 days, Kippour → Souccot is 5) that must not read as an end.
    const next = days.slice(i + 1, i + 13).some((d) => feastKindOf(d) === kind);
    if (!next) ends.push({ feast: kind, endedOn: days[i].date });
  }
  return ends;
}

/** Whether `today` sits in the 7-day après-fêtes window of some feast. */
export function activePostFeast(
  days: CalendarDay[],
  today: string,
): PostFeastWindow | null {
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  for (const end of feastEnds(days)) {
    const endMs = Date.parse(`${end.endedOn}T00:00:00Z`);
    const diff = Math.round((todayMs - endMs) / 86_400_000);
    if (diff >= 1 && diff <= 7) return end;
  }
  return null;
}
