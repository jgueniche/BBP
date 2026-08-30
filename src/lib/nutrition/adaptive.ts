import { computeTrend, type WeightPoint } from "./ewma";
import {
  computeCalorieTarget,
  computeProteinTarget,
  type Gender,
  type GoalType,
} from "./tdee";

const KCAL_PER_KG = 7700;
const MIN_WEIGHT_POINTS = 8;
const MIN_LOGGED_DAYS = 10;
const MIN_PLAUSIBLE_DAY_KCAL = 800;
// A single update never moves the TDEE estimate by more than this share.
const MAX_TDEE_STEP_PCT = 0.15;
const BLEND_NEW_WEIGHT = 0.5;

export type AdaptiveInput = {
  weights: WeightPoint[];
  dailyIntakes: Array<{ date: string; kcal: number }>;
  currentTdee: number;
  currentCalorieTarget: number | null;
  goalType: GoalType;
  weeklyRatePct: number | null;
  gender: Gender;
};

export type AdaptiveResult = {
  newTdee: number;
  newCalorieTarget: number | null;
  newProteinTarget: number | null;
  avgIntakeKcal: number;
  trendChangeKg: number;
  daysWithLogs: number;
  clamped: boolean;
};

/**
 * Weekly adaptive TDEE (brief §4.4): compare the average logged intake with
 * the observed EWMA trend change over the window, then propose new targets.
 * Returns null when the data is too sparse to be trustworthy.
 */
export function computeAdaptiveTdee(
  input: AdaptiveInput,
): AdaptiveResult | null {
  const trend = computeTrend(input.weights);
  if (trend.length < MIN_WEIGHT_POINTS) return null;

  const first = trend[0]!;
  const last = trend[trend.length - 1]!;
  const spanDays = Math.round(
    (new Date(`${last.date}T00:00:00Z`).getTime() -
      new Date(`${first.date}T00:00:00Z`).getTime()) /
      86_400_000,
  );
  if (spanDays < 14) return null;

  const loggedDays = input.dailyIntakes.filter(
    (day) => day.kcal >= MIN_PLAUSIBLE_DAY_KCAL,
  );
  if (loggedDays.length < MIN_LOGGED_DAYS) return null;

  const avgIntake =
    loggedDays.reduce((sum, day) => sum + day.kcal, 0) / loggedDays.length;

  const trendChangeKg = last.trend_kg - first.trend_kg;
  const dailyBalance = (trendChangeKg * KCAL_PER_KG) / spanDays;
  const observedTdee = avgIntake - dailyBalance;

  let newTdee = Math.round(
    BLEND_NEW_WEIGHT * observedTdee +
      (1 - BLEND_NEW_WEIGHT) * input.currentTdee,
  );

  const maxStep = Math.round(input.currentTdee * MAX_TDEE_STEP_PCT);
  newTdee = Math.min(
    input.currentTdee + maxStep,
    Math.max(input.currentTdee - maxStep, newTdee),
  );
  if (newTdee < 800) return null;

  let newCalorieTarget: number | null = null;
  let newProteinTarget: number | null = null;
  let clamped = false;

  if (input.currentCalorieTarget !== null) {
    const target = computeCalorieTarget({
      tdee: newTdee,
      gender: input.gender,
      weightKg: last.weight_kg,
      goalType: input.goalType,
      weeklyRatePct: input.weeklyRatePct ?? undefined,
    });
    newCalorieTarget = target.calorieTarget;
    clamped = target.clamped;
    newProteinTarget = computeProteinTarget(last.weight_kg, input.goalType);
  }

  return {
    newTdee,
    newCalorieTarget,
    newProteinTarget,
    avgIntakeKcal: Math.round(avgIntake),
    trendChangeKg: Math.round(trendChangeKg * 100) / 100,
    daysWithLogs: loggedDays.length,
    clamped,
  };
}
