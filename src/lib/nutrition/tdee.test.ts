import { describe, expect, it } from "vitest";

import {
  clampWeeklyRate,
  computeBmr,
  computeCalorieTarget,
  computeProteinTarget,
  computeTdee,
} from "./tdee";

describe("computeBmr (Mifflin-St Jeor)", () => {
  it("matches reference values", () => {
    expect(
      computeBmr({ gender: "homme", weightKg: 80, heightCm: 180, age: 35 }),
    ).toBe(10 * 80 + 6.25 * 180 - 5 * 35 + 5);
    expect(
      computeBmr({ gender: "femme", weightKg: 60, heightCm: 165, age: 30 }),
    ).toBe(Math.round(10 * 60 + 6.25 * 165 - 5 * 30 - 161));
  });
});

describe("computeTdee", () => {
  it("applies the activity factor", () => {
    const bmr = computeBmr({
      gender: "homme",
      weightKg: 80,
      heightCm: 180,
      age: 35,
    });
    expect(
      computeTdee({
        gender: "homme",
        weightKg: 80,
        heightCm: 180,
        age: 35,
        activityLevel: "modere",
      }),
    ).toBe(Math.round(bmr * 1.55));
  });
});

describe("computeCalorieTarget — §3.4 guardrails", () => {
  it("never exceeds a 25% deficit", () => {
    // 1%/week on 120kg would be a huge deficit; must clamp to 25% of TDEE.
    const { calorieTarget, clamped } = computeCalorieTarget({
      tdee: 3000,
      gender: "homme",
      weightKg: 120,
      goalType: "perte",
      weeklyRatePct: 1,
    });
    expect(clamped).toBe(true);
    expect(calorieTarget).toBe(3000 - 3000 * 0.25);
  });

  it("never goes below 1200 kcal for women", () => {
    const { calorieTarget, clamped } = computeCalorieTarget({
      tdee: 1400,
      gender: "femme",
      weightKg: 50,
      goalType: "perte",
      weeklyRatePct: 1,
    });
    expect(clamped).toBe(true);
    expect(calorieTarget).toBe(1200);
  });

  it("never goes below 1500 kcal for men", () => {
    const { calorieTarget } = computeCalorieTarget({
      tdee: 1700,
      gender: "homme",
      weightKg: 60,
      goalType: "perte",
      weeklyRatePct: 1,
    });
    expect(calorieTarget).toBeGreaterThanOrEqual(1500);
  });

  it("returns TDEE for maintenance", () => {
    expect(
      computeCalorieTarget({
        tdee: 2200,
        gender: "autre",
        weightKg: 70,
        goalType: "maintien",
      }),
    ).toEqual({ calorieTarget: 2200, clamped: false });
  });

  it("applies a normal deficit when within bounds", () => {
    // 0.5%/week on 80kg = 0.4kg/week = 440 kcal/day, TDEE 2800 -> 2360.
    const { calorieTarget, clamped } = computeCalorieTarget({
      tdee: 2800,
      gender: "homme",
      weightKg: 80,
      goalType: "perte",
      weeklyRatePct: 0.5,
    });
    expect(clamped).toBe(false);
    expect(calorieTarget).toBe(2360);
  });
});

describe("clampWeeklyRate", () => {
  it("keeps the rate between 0.25 and 1%/week", () => {
    expect(clampWeeklyRate(0.1)).toBe(0.25);
    expect(clampWeeklyRate(2)).toBe(1);
    expect(clampWeeklyRate(0.7)).toBe(0.7);
  });
});

describe("computeProteinTarget", () => {
  it("gives 1.8 g/kg on a cut and 1.2 g/kg on maintenance", () => {
    expect(computeProteinTarget(80, "perte")).toBe(144);
    expect(computeProteinTarget(80, "maintien")).toBe(96);
  });
});
