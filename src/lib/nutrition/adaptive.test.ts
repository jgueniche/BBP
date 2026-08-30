import { describe, expect, it } from "vitest";

import { computeAdaptiveTdee, type AdaptiveInput } from "./adaptive";
import { MIN_CALORIES } from "./tdee";

function dates(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(`${start}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function baseInput(overrides: Partial<AdaptiveInput> = {}): AdaptiveInput {
  const days = dates("2026-08-01", 28);
  return {
    weights: days.map((date) => ({ date, weight_kg: 80 })),
    dailyIntakes: days.map((date) => ({ date, kcal: 2400 })),
    currentTdee: 2600,
    currentCalorieTarget: 2100,
    goalType: "perte",
    weeklyRatePct: 0.5,
    gender: "homme",
    ...overrides,
  };
}

describe("computeAdaptiveTdee", () => {
  it("lowers the TDEE estimate on a plateau with a known intake", () => {
    // Weight is flat while eating 2400: the real TDEE is ~2400, not 2600.
    const result = computeAdaptiveTdee(baseInput());
    expect(result).not.toBeNull();
    expect(result!.newTdee).toBeLessThan(2600);
    expect(result!.newTdee).toBeGreaterThanOrEqual(2400);
    expect(result!.newCalorieTarget).not.toBeNull();
  });

  it("raises the TDEE estimate when losing faster than expected", () => {
    const days = dates("2026-08-01", 28);
    const result = computeAdaptiveTdee(
      baseInput({
        // 1 kg lost over 4 weeks while eating 2400.
        weights: days.map((date, i) => ({
          date,
          weight_kg: 80 - (1 / 27) * i,
        })),
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.newTdee).toBeGreaterThan(2600 - 400);
    expect(result!.trendChangeKg).toBeLessThan(0);
  });

  it("caps a single adjustment at 15% of the current TDEE", () => {
    const result = computeAdaptiveTdee(
      baseInput({
        // Absurd data: flat weight at only 1200 kcal would imply TDEE 1200.
        dailyIntakes: dates("2026-08-01", 28).map((date) => ({
          date,
          kcal: 1200,
        })),
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.newTdee).toBeGreaterThanOrEqual(Math.round(2600 * 0.85));
  });

  it("returns null with too few weight points", () => {
    const days = dates("2026-08-01", 4);
    expect(
      computeAdaptiveTdee(
        baseInput({
          weights: days.map((date) => ({ date, weight_kg: 80 })),
        }),
      ),
    ).toBeNull();
  });

  it("returns null with too few logged days", () => {
    expect(
      computeAdaptiveTdee(
        baseInput({
          dailyIntakes: dates("2026-08-01", 5).map((date) => ({
            date,
            kcal: 2200,
          })),
        }),
      ),
    ).toBeNull();
  });

  it("ignores implausibly low logged days", () => {
    const days = dates("2026-08-01", 28);
    const result = computeAdaptiveTdee(
      baseInput({
        dailyIntakes: days.map((date, i) => ({
          date,
          kcal: i % 2 === 0 ? 2400 : 200,
        })),
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.daysWithLogs).toBe(14);
    expect(result!.avgIntakeKcal).toBe(2400);
  });

  it("never proposes a calorie target below the §3.4 floors", () => {
    const days = dates("2026-08-01", 28);
    const result = computeAdaptiveTdee(
      baseInput({
        gender: "femme",
        currentTdee: 1500,
        currentCalorieTarget: 1250,
        weeklyRatePct: 1,
        weights: days.map((date) => ({ date, weight_kg: 52 })),
        dailyIntakes: days.map((date) => ({ date, kcal: 1300 })),
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.newCalorieTarget).toBeGreaterThanOrEqual(MIN_CALORIES.femme);
  });

  it("keeps maintenance users without a calorie target", () => {
    const result = computeAdaptiveTdee(
      baseInput({ currentCalorieTarget: null, goalType: "maintien" }),
    );
    expect(result).not.toBeNull();
    expect(result!.newCalorieTarget).toBeNull();
  });
});
