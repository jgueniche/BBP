import { describe, expect, it } from "vitest";

import { isReservedRecipeSlug } from "@/lib/recipes/slugs";
import { addDays, localClock, todayIn } from "@/lib/utils/local-date";

import {
  cookSummary,
  formatCookedDay,
  groupByMonth,
  isValidCookedOn,
} from "./journal";

describe("cooking days", () => {
  it("takes the day in Paris, not in UTC", () => {
    // 23:30 UTC on 29/09 is already 30/09 in Paris.
    expect(todayIn("Europe/Paris", new Date("2026-09-29T23:30:00Z"))).toBe(
      "2026-09-30",
    );
    expect(todayIn(null, new Date("2026-09-29T21:59:00Z"))).toBe("2026-09-29");
    expect(
      localClock(new Date("2026-09-29T12:05:00Z"), "nowhere/zone"),
    ).toEqual({ day: "2026-09-29", minutes: 14 * 60 + 5 });
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("accepts real past days, today and tomorrow at most", () => {
    const today = "2026-09-29";
    expect(isValidCookedOn("2026-09-12", today)).toBe(true);
    expect(isValidCookedOn("2026-09-30", today)).toBe(true);
    expect(isValidCookedOn("2026-10-01", today)).toBe(false);
    expect(isValidCookedOn("2026-02-30", today)).toBe(false);
    expect(isValidCookedOn("1999-12-31", today)).toBe(false);
    expect(isValidCookedOn("12/09/2026", today)).toBe(false);
  });
});

describe("journal", () => {
  const entries = [
    { id: "a", cookedOn: "2026-08-30", createdAt: "2026-08-30T19:00:00Z" },
    { id: "b", cookedOn: "2026-09-12", createdAt: "2026-09-12T12:00:00Z" },
    { id: "c", cookedOn: "2026-09-12", createdAt: "2026-09-12T20:00:00Z" },
    { id: "d", cookedOn: "2026-09-03", createdAt: "2026-09-20T08:00:00Z" },
  ];

  it("groups by month, newest first, without scores or streaks", () => {
    expect(
      groupByMonth(entries).map((m) => [m.label, m.entries.map((e) => e.id)]),
    ).toEqual([
      ["Septembre 2026", ["c", "b", "d"]],
      ["Août 2026", ["a"]],
    ]);
  });

  it("writes the day the French way", () => {
    expect(formatCookedDay("2026-09-12")).toBe("12 septembre");
    expect(formatCookedDay("2026-01-01")).toBe("1 janvier");
  });

  it("sums up my cooks of a recipe", () => {
    expect(cookSummary(["2026-09-12", "2026-08-30", "2026-09-20"])).toEqual({
      times: 3,
      last: "2026-09-20",
    });
    expect(cookSummary([])).toEqual({ times: 0, last: null });
  });
});

describe("recipe slugs", () => {
  it("never takes the name of a page of /recettes", () => {
    for (const slug of [
      "journal",
      "importer",
      "nouvelle",
      "carnets",
      "etiquette",
    ]) {
      expect(isReservedRecipeSlug(slug)).toBe(true);
    }
    expect(isReservedRecipeSlug("journal-de-bord")).toBe(false);
  });
});
