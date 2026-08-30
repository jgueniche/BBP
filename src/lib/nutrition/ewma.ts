export type WeightPoint = { date: string; weight_kg: number };
export type TrendPoint = WeightPoint & { trend_kg: number };

export const EWMA_ALPHA = 0.1;

const MS_PER_DAY = 86_400_000;

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T00:00:00Z`).getTime() -
      new Date(`${a}T00:00:00Z`).getTime()) /
      MS_PER_DAY,
  );
}

/**
 * Exponentially weighted moving average over dated entries.
 * Gaps are handled by compounding the smoothing factor per missing day,
 * so an entry after a 3-day gap moves the trend as much as 3 daily entries.
 */
export function computeTrend(
  points: WeightPoint[],
  alpha: number = EWMA_ALPHA,
): TrendPoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const result: TrendPoint[] = [];
  let trend: number | null = null;
  let previousDate: string | null = null;

  for (const point of sorted) {
    if (trend === null || previousDate === null) {
      trend = point.weight_kg;
    } else {
      const gap = Math.max(1, daysBetween(previousDate, point.date));
      const effectiveAlpha = 1 - Math.pow(1 - alpha, gap);
      trend = trend + effectiveAlpha * (point.weight_kg - trend);
    }
    previousDate = point.date;
    result.push({ ...point, trend_kg: Math.round(trend * 100) / 100 });
  }
  return result;
}

/** Average trend change per week over (up to) the trailing `windowDays`. */
export function weeklyTrendChange(
  trendPoints: TrendPoint[],
  windowDays = 14,
): number | null {
  if (trendPoints.length < 2) return null;
  const last = trendPoints[trendPoints.length - 1]!;
  const cutoff = new Date(
    new Date(`${last.date}T00:00:00Z`).getTime() - windowDays * MS_PER_DAY,
  )
    .toISOString()
    .slice(0, 10);
  const windowPoints = trendPoints.filter((p) => p.date >= cutoff);
  if (windowPoints.length < 2) return null;
  const first = windowPoints[0]!;
  const days = daysBetween(first.date, last.date);
  if (days < 3) return null;
  const perDay = (last.trend_kg - first.trend_kg) / days;
  return Math.round(perDay * 7 * 100) / 100;
}

/**
 * Projected date of reaching `targetKg` at the current weekly change.
 * Null when there is no usable rate or the trend moves away from the target.
 */
export function projectTargetDate(
  currentTrendKg: number,
  targetKg: number,
  weeklyChangeKg: number | null,
  from = new Date(),
): Date | null {
  if (weeklyChangeKg === null || Math.abs(weeklyChangeKg) < 0.05) return null;
  const remaining = targetKg - currentTrendKg;
  if (Math.abs(remaining) < 0.05) return null;
  if (Math.sign(remaining) !== Math.sign(weeklyChangeKg)) return null;
  const weeks = remaining / weeklyChangeKg;
  if (weeks > 52 * 3) return null;
  return new Date(from.getTime() + weeks * 7 * MS_PER_DAY);
}
