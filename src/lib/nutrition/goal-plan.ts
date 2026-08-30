import type { TrendPoint, WeightPoint } from "@/lib/nutrition/ewma";

export type PlannedPoint = { date: string; planned_kg: number };

export type GoalPlanInput = {
  /** Goal creation timestamp or date (ISO). */
  createdAt: string;
  targetKg: number;
  /** Percent of body weight lost (or gained) per week, e.g. 0.5. */
  weeklyRatePct: number;
  /** All known weigh-ins, any order. */
  weights: WeightPoint[];
};

export type GoalPlan = {
  startDate: string;
  startKg: number;
  targetKg: number;
  /** Planned kg change per week at the starting weight (signed). */
  plannedWeeklyKg: number;
  plannedDate: string;
  /** Weekly sampled trajectory from start to target (inclusive). */
  points: PlannedPoint[];
};

const MS_PER_DAY = 86_400_000;
const MAX_WEEKS = 156;

function addDaysIso(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

/**
 * Starting weight of the plan: the last weigh-in on or before the goal was
 * created, else the first one after it (goal set before the first weigh-in).
 */
export function goalStartWeight(
  weights: WeightPoint[],
  startDate: string,
): number | null {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const before = sorted.filter((w) => w.date <= startDate).at(-1);
  if (before) return before.weight_kg;
  return sorted.at(0)?.weight_kg ?? null;
}

/**
 * The planned trajectory implied by the goal: `weeklyRatePct` percent of the
 * current weight per week (compounding, like the §3.4 guardrails), sampled
 * weekly from the goal's start until the target is reached. Null when there is
 * no usable start weight, no meaningful gap to the target, or a rate of zero.
 */
export function buildGoalPlan(input: GoalPlanInput): GoalPlan | null {
  const rate = Math.abs(input.weeklyRatePct) / 100;
  if (rate === 0) return null;
  const startDate = input.createdAt.slice(0, 10);
  const startKg = goalStartWeight(input.weights, startDate);
  if (startKg === null) return null;
  const gap = input.targetKg - startKg;
  if (Math.abs(gap) < 0.1) return null;

  const direction = Math.sign(gap);
  const factor = 1 + direction * rate;
  const points: PlannedPoint[] = [
    { date: startDate, planned_kg: Math.round(startKg * 100) / 100 },
  ];
  let weight = startKg;
  for (let week = 1; week <= MAX_WEEKS; week += 1) {
    weight *= factor;
    const reached =
      direction < 0 ? weight <= input.targetKg : weight >= input.targetKg;
    points.push({
      date: addDaysIso(startDate, week * 7),
      planned_kg: Math.round((reached ? input.targetKg : weight) * 100) / 100,
    });
    if (reached) break;
  }

  return {
    startDate,
    startKg,
    targetKg: input.targetKg,
    plannedWeeklyKg: Math.round(direction * rate * startKg * 100) / 100,
    plannedDate: points.at(-1)!.date,
    points,
  };
}

/**
 * Planned weight on a given date, linearly interpolated between the weekly
 * samples; clamped to the plan's ends outside its range.
 */
export function plannedWeightAt(plan: GoalPlan, date: string): number {
  const { points } = plan;
  if (date <= points[0]!.date) return points[0]!.planned_kg;
  const last = points.at(-1)!;
  if (date >= last.date) return last.planned_kg;
  for (let i = 1; i < points.length; i += 1) {
    const b = points[i]!;
    if (date > b.date) continue;
    const a = points[i - 1]!;
    const span =
      new Date(`${b.date}T00:00:00Z`).getTime() -
      new Date(`${a.date}T00:00:00Z`).getTime();
    const into =
      new Date(`${date}T00:00:00Z`).getTime() -
      new Date(`${a.date}T00:00:00Z`).getTime();
    const ratio = span === 0 ? 0 : into / span;
    return (
      Math.round((a.planned_kg + ratio * (b.planned_kg - a.planned_kg)) * 100) /
      100
    );
  }
  return last.planned_kg;
}

/** Share of the planned change already achieved by the current trend, 0..1+. */
export function goalProgressRatio(
  plan: GoalPlan,
  currentTrend: TrendPoint | null,
): number | null {
  if (!currentTrend) return null;
  const total = plan.targetKg - plan.startKg;
  if (Math.abs(total) < 0.1) return null;
  const done = currentTrend.trend_kg - plan.startKg;
  return Math.max(0, done / total);
}

/**
 * Signed gap between the plan and reality on the trend's last day: negative
 * means ahead of a loss plan (lighter than planned), positive means behind.
 */
export function gapToPlanKg(
  plan: GoalPlan,
  currentTrend: TrendPoint | null,
): number | null {
  if (!currentTrend) return null;
  const planned = plannedWeightAt(plan, currentTrend.date);
  return Math.round((currentTrend.trend_kg - planned) * 100) / 100;
}

/** BMI 18.5 floor for a target weight — we never coach below underweight. */
export function minHealthyTargetKg(heightCm: number): number {
  const meters = heightCm / 100;
  return Math.ceil(18.5 * meters * meters * 2) / 2;
}
