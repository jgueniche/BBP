import { describe, expect, it } from "vitest";

import { computeTrend, projectTargetDate, weeklyTrendChange } from "./ewma";

function series(
  startDate: string,
  weights: number[],
  stepDays = 1,
): { date: string; weight_kg: number }[] {
  return weights.map((weight_kg, i) => {
    const d = new Date(`${startDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i * stepDays);
    return { date: d.toISOString().slice(0, 10), weight_kg };
  });
}

describe("computeTrend (EWMA)", () => {
  it("starts at the first weight", () => {
    const trend = computeTrend(series("2026-08-01", [80, 80.5]));
    expect(trend[0]!.trend_kg).toBe(80);
  });

  it("stays flat on a constant series", () => {
    const trend = computeTrend(series("2026-08-01", [75, 75, 75, 75, 75]));
    expect(trend.at(-1)!.trend_kg).toBe(75);
  });

  it("smooths a noisy series toward the mean", () => {
    const trend = computeTrend(series("2026-08-01", [80, 82, 78, 81, 79]));
    const last = trend.at(-1)!.trend_kg;
    expect(last).toBeGreaterThan(79);
    expect(last).toBeLessThan(81);
  });

  it("compounds the smoothing across gaps in the data", () => {
    const daily = computeTrend([
      { date: "2026-08-01", weight_kg: 80 },
      { date: "2026-08-02", weight_kg: 78 },
      { date: "2026-08-03", weight_kg: 78 },
      { date: "2026-08-04", weight_kg: 78 },
    ]);
    const gapped = computeTrend([
      { date: "2026-08-01", weight_kg: 80 },
      { date: "2026-08-04", weight_kg: 78 },
    ]);
    expect(gapped.at(-1)!.trend_kg).toBeCloseTo(daily.at(-1)!.trend_kg, 1);
  });

  it("sorts unordered input by date", () => {
    const trend = computeTrend([
      { date: "2026-08-03", weight_kg: 79 },
      { date: "2026-08-01", weight_kg: 80 },
      { date: "2026-08-02", weight_kg: 79.5 },
    ]);
    expect(trend.map((p) => p.date)).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
  });
});

describe("weeklyTrendChange", () => {
  it("measures a steady loss", () => {
    // 0.5 kg/week raw loss; the EWMA trend lags but must be negative.
    const weights = series(
      "2026-08-01",
      Array.from({ length: 28 }, (_, i) => 80 - (0.5 / 7) * i),
    );
    const change = weeklyTrendChange(computeTrend(weights));
    expect(change).not.toBeNull();
    expect(change!).toBeLessThan(-0.2);
    expect(change!).toBeGreaterThan(-0.6);
  });

  it("is ~zero on a plateau", () => {
    const weights = series(
      "2026-08-01",
      Array.from({ length: 21 }, () => 75),
    );
    expect(weeklyTrendChange(computeTrend(weights))).toBe(0);
  });

  it("returns null with too little data", () => {
    expect(
      weeklyTrendChange(computeTrend(series("2026-08-01", [80]))),
    ).toBeNull();
  });
});

describe("projectTargetDate", () => {
  it("projects a reachable target", () => {
    const date = projectTargetDate(80, 76, -0.5, new Date("2026-08-30"));
    expect(date).not.toBeNull();
    // 4 kg at 0.5 kg/week = 8 weeks.
    expect(date!.toISOString().slice(0, 10)).toBe("2026-10-25");
  });

  it("returns null when the trend moves away from the target", () => {
    expect(projectTargetDate(80, 76, 0.3, new Date("2026-08-30"))).toBeNull();
  });

  it("returns null on a plateau", () => {
    expect(projectTargetDate(80, 76, 0, new Date("2026-08-30"))).toBeNull();
  });
});
