import { describe, expect, it } from "vitest";

import { computeTrend } from "./ewma";
import {
  buildGoalPlan,
  gapToPlanKg,
  goalProgressRatio,
  goalStartWeight,
  minHealthyTargetKg,
  plannedWeightAt,
} from "./goal-plan";

const weights = [
  { date: "2026-06-01", weight_kg: 100 },
  { date: "2026-06-15", weight_kg: 98.6 },
];

describe("goalStartWeight", () => {
  it("uses the last weigh-in on or before the goal date", () => {
    expect(goalStartWeight(weights, "2026-06-10")).toBe(100);
    expect(goalStartWeight(weights, "2026-06-15")).toBe(98.6);
  });

  it("falls back to the first weigh-in when the goal predates them", () => {
    expect(goalStartWeight(weights, "2026-05-01")).toBe(100);
  });

  it("returns null without any weigh-in", () => {
    expect(goalStartWeight([], "2026-06-01")).toBeNull();
  });
});

describe("buildGoalPlan", () => {
  const plan = buildGoalPlan({
    createdAt: "2026-06-01T09:30:00Z",
    targetKg: 90,
    weeklyRatePct: 1,
    weights,
  })!;

  it("compounds 1%/week from 100 down to 90 in 11 weeks", () => {
    // 100 × 0.99^n ≤ 90 → n = 11 (0.99^10 ≈ 0.9044, 0.99^11 ≈ 0.8953).
    expect(plan.points).toHaveLength(12); // start + 11 weeks
    expect(plan.points[0]).toEqual({ date: "2026-06-01", planned_kg: 100 });
    expect(plan.points[1]!.planned_kg).toBeCloseTo(99, 2);
    expect(plan.points.at(-1)!.planned_kg).toBe(90); // clamped to target
    expect(plan.plannedDate).toBe("2026-08-17"); // 11 × 7 days later
    expect(plan.plannedWeeklyKg).toBe(-1);
  });

  it("supports gaining plans (recomp)", () => {
    const up = buildGoalPlan({
      createdAt: "2026-06-01",
      targetKg: 101,
      weeklyRatePct: 0.5,
      weights,
    })!;
    expect(up.plannedWeeklyKg).toBeCloseTo(0.5, 2);
    expect(up.points.at(-1)!.planned_kg).toBe(101);
  });

  it("returns null without weights, without gap, or without rate", () => {
    expect(
      buildGoalPlan({
        createdAt: "2026-06-01",
        targetKg: 90,
        weeklyRatePct: 1,
        weights: [],
      }),
    ).toBeNull();
    expect(
      buildGoalPlan({
        createdAt: "2026-06-01",
        targetKg: 100.05,
        weeklyRatePct: 1,
        weights,
      }),
    ).toBeNull();
    expect(
      buildGoalPlan({
        createdAt: "2026-06-01",
        targetKg: 90,
        weeklyRatePct: 0,
        weights,
      }),
    ).toBeNull();
  });
});

describe("plannedWeightAt / gap / progress", () => {
  const plan = buildGoalPlan({
    createdAt: "2026-06-01",
    targetKg: 90,
    weeklyRatePct: 1,
    weights,
  })!;

  it("interpolates between weekly samples and clamps outside the plan", () => {
    expect(plannedWeightAt(plan, "2026-05-01")).toBe(100);
    // Mid-week between 100 and 99.
    expect(plannedWeightAt(plan, "2026-06-04")).toBeCloseTo(99.57, 1);
    expect(plannedWeightAt(plan, "2027-06-01")).toBe(90);
  });

  it("computes the signed gap to plan and the progress ratio", () => {
    const trend = computeTrend([
      { date: "2026-06-01", weight_kg: 100 },
      { date: "2026-06-08", weight_kg: 99.5 },
    ]);
    const last = trend.at(-1)!;
    // Planned on 2026-06-08 is 99; trend is above → behind the loss plan.
    expect(gapToPlanKg(plan, last)).toBeGreaterThan(0);
    expect(goalProgressRatio(plan, last)).toBeGreaterThan(0);
    expect(gapToPlanKg(plan, null)).toBeNull();
    expect(goalProgressRatio(plan, null)).toBeNull();
  });
});

describe("minHealthyTargetKg", () => {
  it("floors the target at BMI 18.5, rounded up to 0.5 kg", () => {
    // 1.80 m → 18.5 × 3.24 = 59.94 → 60.0
    expect(minHealthyTargetKg(180)).toBe(60);
    // 1.65 m → 18.5 × 2.7225 = 50.37 → 50.5
    expect(minHealthyTargetKg(165)).toBe(50.5);
  });
});
