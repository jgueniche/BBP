import type { PlanMeal } from "./types";

/** Assumed meal times (hours) for the meat→dairy wait computation. */
export const MEAL_TIMES: Record<PlanMeal, number> = {
  petit_dej: 8,
  dej: 12.5,
  diner: 20,
};

/** Share of the daily calorie target each meal is expected to carry. */
export const MEAL_SHARES: Record<PlanMeal, number> = {
  petit_dej: 0.25,
  dej: 0.4,
  diner: 0.35,
};

export const MEAL_ORDER: PlanMeal[] = ["petit_dej", "dej", "diner"];

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Monday of the week containing the given date (UTC-safe on date strings). */
export function weekStartOf(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const day = date.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - diff);
  return toDateString(date);
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateString(date);
}

/** The 7 dates of a week, Monday first. */
export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(dateStr: string, weekStart: string): number {
  const a = new Date(`${weekStart}T00:00:00Z`).getTime();
  const b = new Date(`${dateStr}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}
