import { addDays } from "@/lib/utils/local-date";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A cooking day: a real calendar date, from 2000 to today (one day of
 * tolerance for people ahead of Paris time).
 */
export function isValidCookedOn(value: string, today: string): boolean {
  if (!DAY.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  if (date.toISOString().slice(0, 10) !== value) return false;
  return value >= "2000-01-01" && value <= addDays(today, 1);
}

export type JournalMonth<T> = { key: string; label: string; entries: T[] };

const monthFormat = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("fr-FR") + text.slice(1);
}

/** Entries newest first, grouped by month (« Septembre 2026 »). */
export function groupByMonth<T extends { cookedOn: string; createdAt: string }>(
  entries: T[],
): JournalMonth<T>[] {
  const sorted = [...entries].sort(
    (a, b) =>
      b.cookedOn.localeCompare(a.cookedOn) ||
      b.createdAt.localeCompare(a.createdAt),
  );
  const months: JournalMonth<T>[] = [];
  for (const entry of sorted) {
    const key = entry.cookedOn.slice(0, 7);
    const last = months.at(-1);
    if (last && last.key === key) {
      last.entries.push(entry);
    } else {
      months.push({
        key,
        label: capitalize(monthFormat.format(new Date(`${key}-01T00:00:00Z`))),
        entries: [entry],
      });
    }
  }
  return months;
}

const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** « 12 septembre », for a YYYY-MM-DD day. */
export function formatCookedDay(day: string): string {
  return dayFormat.format(new Date(`${day}T00:00:00Z`));
}

/** How many times I cooked a recipe, and when last. */
export function cookSummary(days: string[]): {
  times: number;
  last: string | null;
} {
  const sorted = [...days].sort();
  return { times: sorted.length, last: sorted.at(-1) ?? null };
}
