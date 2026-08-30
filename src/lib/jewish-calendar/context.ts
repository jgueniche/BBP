import {
  activePostFeast,
  computeCalendarDays,
  DEFAULT_CALENDAR_SETTINGS,
  type CalendarDay,
  type CalendarSettings,
} from "./engine";
import { resolveLocation } from "./locations";

export type CalendarContext = {
  text: string;
  isFastToday: boolean;
};

function frDate(dateKey: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

function weekdayOf(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay();
}

function wishesFor(today: CalendarDay, tomorrow: CalendarDay | undefined) {
  const wishes: string[] = [];
  if (today.isFast) {
    wishes.push("Souhaite un jeûne facile (tsom kal).");
  } else if (today.isErev && weekdayOf(today.date) === 5 && !tomorrow?.isChag) {
    wishes.push("C'est erev chabbat : souhaite chabbat chalom.");
  } else if (today.isErev && tomorrow?.isChag) {
    wishes.push("C'est veille de fête : souhaite hag saméah.");
  } else if (today.isChag) {
    wishes.push("Souhaite hag saméah.");
  } else if (today.isHanouka) {
    wishes.push("Souhaite hanouka saméah.");
  } else if (today.holidays.includes("Purim")) {
    wishes.push("Souhaite Pourim saméah.");
  }
  return wishes;
}

/**
 * Kémia's calendar block: today's Hebrew date, fasts (no calorie talk),
 * Pessah, upcoming candle times, budget-kiff feasts, Chavouot dairy note,
 * après-fêtes mode and the matching wishes (brief §10.13).
 */
export function buildCalendarContext(
  now: Date = new Date(),
  settings: Partial<CalendarSettings> = {},
): CalendarContext {
  const full = { ...DEFAULT_CALENDAR_SETTINGS, ...settings };
  const timeZone = resolveLocation(full.city).location.getTzid();
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);

  const back = new Date(Date.parse(`${todayKey}T00:00:00Z`) - 10 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const days = computeCalendarDays(back, 19, full);
  const todayIndex = days.findIndex((d) => d.date === todayKey);
  if (todayIndex === -1) return { text: "", isFastToday: false };
  const today = days[todayIndex];
  const upcoming = days.slice(todayIndex + 1, todayIndex + 8);

  const lines: string[] = [
    `Aujourd'hui : ${frDate(todayKey)} (${today.hebrewDate}).`,
  ];

  if (today.isFast) {
    lines.push(
      `JEÛNE AUJOURD'HUI (${today.fastName}) : aucun objectif calorique, conseils hydratation et repas d'avant/après uniquement, jamais présenter le jeûne comme un outil minceur.`,
    );
  }
  if (today.isPessah) {
    lines.push(
      "PESSAH en cours : pas de hametz (blé, orge, seigle, avoine, épeautre levés) ; kitniyot selon le minhag de la personne.",
    );
  }
  if (today.isFeast) {
    lines.push(
      "Jour de fête : mode « budget kiff » — on célèbre, aucun discours de déficit aujourd'hui.",
    );
  }
  if (today.isChavouot || upcoming[0]?.isChavouot) {
    lines.push(
      "Chavouot : le repas lacté est la tradition (cheesecake compris).",
    );
  }
  if (today.labels.length > 0 && !today.isFast) {
    lines.push(`Au calendrier : ${today.labels.join(", ")}.`);
  }

  for (const dayInfo of upcoming) {
    const bits: string[] = [];
    if (dayInfo.labels.length > 0) bits.push(dayInfo.labels.join(", "));
    if (dayInfo.candleTime) bits.push(`allumage à ${dayInfo.candleTime}`);
    if (bits.length > 0) {
      lines.push(`${frDate(dayInfo.date)} : ${bits.join(", ")}.`);
    }
  }
  if (today.candleTime) {
    lines.push(`Allumage des bougies ce soir à ${today.candleTime}.`);
  }
  if (today.havdalahTime) {
    lines.push(`Sortie (havdalah) à ${today.havdalahTime}.`);
  }

  const postFeast = activePostFeast(days, todayKey);
  if (postFeast) {
    lines.push(
      "Mode après-fêtes actif : semaine de recadrage doux, retour aux habitudes sans aucune culpabilisation.",
    );
  }

  lines.push(...wishesFor(today, upcoming[0]));

  return { text: lines.join(" "), isFastToday: today.isFast };
}
