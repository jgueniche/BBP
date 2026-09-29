import {
  computeCalendarDays,
  DEFAULT_CALENDAR_SETTINGS,
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

/**
 * The assistant's calendar block, only for people who follow the Jewish
 * calendar: factual dates, fasts, Pessah, feasts and candle times. No wishes
 * or cultural lexicon — the assistant keeps a neutral voice (ADR-029).
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
      `JEÛNE AUJOURD'HUI (${today.fastName}) : aucune suggestion de repas en journée ; propose seulement des idées pour le repas d'avant ou d'après.`,
    );
  }
  if (today.isPessah) {
    lines.push(
      "PESSAH en cours : aucun ingrédient levé à base de blé, orge, seigle, avoine ou épeautre ; légumineuses selon le profil.",
    );
  }
  if (today.isFeast) {
    lines.push("Jour de fête : propose volontiers des recettes de fête.");
  }
  if (today.isChavouot || upcoming[0]?.isChavouot) {
    lines.push(
      "Chavouot : un repas à base de produits laitiers est de tradition.",
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

  return { text: lines.join(" "), isFastToday: today.isFast };
}
