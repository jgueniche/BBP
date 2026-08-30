export type Gender = "femme" | "homme" | "autre";
export type ActivityLevel =
  "sedentaire" | "leger" | "modere" | "actif" | "tres_actif";
export type GoalType = "perte" | "maintien" | "recomp";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentaire: 1.2,
  leger: 1.375,
  modere: 1.55,
  actif: 1.725,
  tres_actif: 1.9,
};

// Brief §3.4 hard limits — also enforced by the coach prompt and the DB check.
export const MIN_CALORIES: Record<Gender, number> = {
  femme: 1200,
  homme: 1500,
  autre: 1200,
};
export const MAX_DEFICIT_PCT = 0.25;
export const MIN_WEEKLY_RATE_PCT = 0.25;
export const MAX_WEEKLY_RATE_PCT = 1;

const KCAL_PER_KG = 7700;

export function computeBmr(params: {
  gender: Gender;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const { gender, weightKg, heightCm, age } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === "homme") return Math.round(base + 5);
  if (gender === "femme") return Math.round(base - 161);
  return Math.round(base - 78);
}

export function computeTdee(params: {
  gender: Gender;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
}): number {
  return Math.round(
    computeBmr(params) * ACTIVITY_FACTORS[params.activityLevel],
  );
}

export function clampWeeklyRate(pct: number): number {
  return Math.min(MAX_WEEKLY_RATE_PCT, Math.max(MIN_WEEKLY_RATE_PCT, pct));
}

export function computeCalorieTarget(params: {
  tdee: number;
  gender: Gender;
  weightKg: number;
  goalType: GoalType;
  weeklyRatePct?: number;
}): { calorieTarget: number; clamped: boolean } {
  const { tdee, gender, weightKg, goalType } = params;

  if (goalType === "maintien") {
    return { calorieTarget: tdee, clamped: false };
  }

  const ratePct =
    goalType === "recomp"
      ? MIN_WEEKLY_RATE_PCT
      : clampWeeklyRate(params.weeklyRatePct ?? 0.5);
  const dailyDeficit = (weightKg * (ratePct / 100) * KCAL_PER_KG) / 7;
  const maxDeficit = tdee * MAX_DEFICIT_PCT;

  let clamped = false;
  let target = tdee - dailyDeficit;
  if (dailyDeficit > maxDeficit) {
    target = tdee - maxDeficit;
    clamped = true;
  }
  const floor = MIN_CALORIES[gender];
  if (target < floor) {
    target = floor;
    clamped = true;
  }
  return { calorieTarget: Math.round(target), clamped };
}

export function computeProteinTarget(
  weightKg: number,
  goalType: GoalType,
): number {
  const perKg = goalType === "maintien" ? 1.2 : 1.8;
  return Math.round(weightKg * perKg);
}

export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  return now.getFullYear() - birthYear;
}
