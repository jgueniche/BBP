import { describe, expect, it } from "vitest";

import { isQuietTime } from "@/lib/jewish-calendar/quiet";

import { BADGE_RULES, earnedBadgeSlugs, type BadgeContext } from "./badges";
import { computeXp, levelForXp, type GamificationStats } from "./levels";
import { computeStreakFrom } from "./streaks";

function stats(overrides: Partial<GamificationStats> = {}): GamificationStats {
  return {
    journalDates: [],
    weighDates: [],
    sportDates: [],
    sessionsCount: 0,
    walkKm: 0,
    publishedRecipes: 0,
    importedRecipes: 0,
    proteinRecipes: 0,
    maxRecipeLikes: 0,
    familyShared: false,
    hasShabbatPlan: false,
    meatWaitDays: 0,
    pessahCleanDays: 0,
    postFeastWeekDone: false,
    weightTrendDropPct: 0,
    stableBoutargueMonth: false,
    postsCount: 0,
    ...overrides,
  };
}

function ctx(
  statsOverrides: Partial<GamificationStats> = {},
  streak = { current: 0, best: 0 },
): BadgeContext {
  return { stats: stats(statsOverrides), journalStreak: streak };
}

describe("streaks — chabbat tolerance", () => {
  const exempt = new Set(["2026-09-12"]); // a Saturday

  it("does not break across an exempt chabbat day", () => {
    const result = computeStreakFrom(
      ["2026-09-10", "2026-09-11", "2026-09-13", "2026-09-14"],
      exempt,
      "2026-09-14",
    );
    expect(result.current).toBe(4);
    expect(result.best).toBe(4);
  });

  it("breaks on a plain missing day", () => {
    const result = computeStreakFrom(
      ["2026-09-10", "2026-09-11", "2026-09-13", "2026-09-14"],
      new Set(),
      "2026-09-14",
    );
    expect(result.current).toBe(2);
  });

  it("keeps yesterday's run when today is not yet logged", () => {
    const result = computeStreakFrom(
      ["2026-09-12", "2026-09-13"],
      new Set(),
      "2026-09-14",
    );
    expect(result.current).toBe(2);
  });

  it("tracks the best run in history", () => {
    const result = computeStreakFrom(
      ["2026-08-01", "2026-08-02", "2026-08-03", "2026-09-14"],
      new Set(),
      "2026-09-14",
    );
    expect(result.current).toBe(1);
    expect(result.best).toBe(3);
  });
});

describe("badges — DoD: annexe B awarded correctly on fixtures", () => {
  it("covers all 16 badges", () => {
    expect(BADGE_RULES).toHaveLength(16);
  });

  const cases: Array<[string, BadgeContext]> = [
    ["premiere-boulette", ctx({ journalDates: ["2026-09-01"] })],
    ["semaine-sahha", ctx({}, { current: 7, best: 7 })],
    ["chabbat-chalom", ctx({ hasShabbatPlan: true })],
    ["roi-couscous", ctx({ publishedRecipes: 10 })],
    ["boutargue-dor", ctx({ maxRecipeLikes: 100 })],
    ["meme-approuve", ctx({ familyShared: true })],
    ["yalla", ctx({ sessionsCount: 1 })],
    ["marcheur-belleville", ctx({ walkKm: 100 })],
    ["belek-le-beurre", ctx({ meatWaitDays: 7 })],
    ["pessah-sans-hametz", ctx({ pessahCleanDays: 8 })],
    ["apres-fetes", ctx({ postFeastWeekDone: true })],
    ["moins-5", ctx({ weightTrendDropPct: 5.2 })],
    ["moins-10", ctx({ weightTrendDropPct: 10.1 })],
    ["tata-fiere", ctx({}, { current: 12, best: 31 })],
    ["importateur", ctx({ importedRecipes: 10 })],
    ["kif-kif", ctx({ stableBoutargueMonth: true })],
  ];

  it.each(cases)("awards %s when its criterion is met", (slug, context) => {
    expect(earnedBadgeSlugs(context)).toContain(slug);
  });

  it.each(cases)("withholds %s on an empty profile", (slug) => {
    expect(earnedBadgeSlugs(ctx())).not.toContain(slug);
  });

  it("awards −5% without −10% at 7 percent", () => {
    const earned = earnedBadgeSlugs(ctx({ weightTrendDropPct: 7 }));
    expect(earned).toContain("moins-5");
    expect(earned).not.toContain("moins-10");
  });
});

describe("XP and levels", () => {
  it("computes deterministic XP", () => {
    expect(
      computeXp(
        stats({
          journalDates: ["a", "b", "c"],
          weighDates: ["a"],
          sessionsCount: 2,
          publishedRecipes: 1,
          walkKm: 10,
        }),
      ),
    ).toBe(30 + 5 + 40 + 30 + 20);
  });

  it("maps XP to the five levels", () => {
    expect(levelForXp(0).name).toBe("Apprenti·e boulette");
    expect(levelForXp(250).name).toBe("Brik confirmée");
    expect(levelForXp(700).name).toBe("Chef couscous");
    expect(levelForXp(2000).name).toBe("Maître kémia");
    expect(levelForXp(9000).name).toBe("Roi/Reine de la boutargue");
    expect(levelForXp(9000).nextMinXp).toBeNull();
  });
});

describe("quiet hours — DoD: nothing during chabbat", () => {
  // Plain chabbat: Friday 2026-10-23 → Saturday 2026-10-24 (Paris).
  it("is quiet on Friday night after candle lighting", () => {
    expect(isQuietTime(new Date("2026-10-23T19:30:00Z"))).toBe(true);
  });

  it("is quiet on Saturday afternoon", () => {
    expect(isQuietTime(new Date("2026-10-24T14:00:00Z"))).toBe(true);
  });

  it("is loud again after havdalah on Saturday night", () => {
    expect(isQuietTime(new Date("2026-10-24T20:30:00Z"))).toBe(false);
  });

  it("is loud on a plain Tuesday noon", () => {
    expect(isQuietTime(new Date("2026-10-20T10:00:00Z"))).toBe(false);
  });

  it("stays quiet through chained chabbat + Rosh Hashana 5787", () => {
    // Sat 2026-09-12 23:30 Paris: between RH first and second night.
    expect(isQuietTime(new Date("2026-09-12T21:30:00Z"))).toBe(true);
    // Sunday night after the RH havdalah (18:55Z) — loud again.
    expect(isQuietTime(new Date("2026-09-13T20:30:00Z"))).toBe(false);
  });
});
