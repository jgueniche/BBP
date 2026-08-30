import { addDays } from "@/lib/planning/week";

export type StreakResult = { current: number; best: number };

/**
 * Chabbat-tolerant streak (brief §4.10): an exempt day (chabbat/yom tov)
 * never breaks a run and never counts as activity. Walking back from today,
 * today itself may still be empty without breaking the run.
 */
export function computeStreakFrom(
  activityDates: Iterable<string>,
  exemptDates: ReadonlySet<string>,
  today: string,
  horizonDays = 400,
): StreakResult {
  const active = new Set(activityDates);

  const current = (() => {
    let count = 0;
    let date = today;
    // A quiet today (not yet logged) doesn't break yesterday's run.
    if (!active.has(date) && !exemptDates.has(date)) {
      date = addDays(date, -1);
    }
    for (let i = 0; i < horizonDays; i += 1) {
      if (active.has(date)) count += 1;
      else if (!exemptDates.has(date)) break;
      date = addDays(date, -1);
    }
    return count;
  })();

  // Best run across the horizon, same tolerance rule.
  let best = current;
  let run = 0;
  let date = addDays(today, -horizonDays);
  for (let i = 0; i <= horizonDays; i += 1) {
    if (active.has(date)) {
      run += 1;
      if (run > best) best = run;
    } else if (!exemptDates.has(date)) {
      run = 0;
    }
    date = addDays(date, 1);
  }

  return { current, best };
}
