import { describe, expect, it } from "vitest";

import { buildCalendarContext } from "@/lib/jewish-calendar/context";
import {
  computeCalendarDays,
  DEFAULT_CALENDAR_SETTINGS,
  type CalendarDay,
} from "@/lib/jewish-calendar/engine";
import { isQuietTime } from "@/lib/jewish-calendar/quiet";

import { buildFallbackPlan } from "./fallback";
import type { PlanContext, PlannerRecipe } from "./types";
import { validatePlan } from "./validate";
import { addDays } from "./week";

function recipe(
  overrides: Partial<PlannerRecipe> & { id: string },
): PlannerRecipe {
  return {
    title: overrides.id,
    icon: null,
    kashrutClass: "parve",
    isFish: false,
    category: "plat",
    kcal: 400,
    proteinG: 20,
    timeMin: 45,
    hasHametz: false,
    hasKitniyot: false,
    tags: [],
    ...overrides,
  };
}

// Enough kcal spread to satisfy the ±10% targets, with hametz traps mixed in.
const POOL: PlannerRecipe[] = [
  recipe({
    id: "couscous",
    title: "Couscous boulettes",
    kashrutClass: "bassari",
    kcal: 572,
    hasHametz: true,
    tags: ["chabbat"],
  }),
  recipe({
    id: "dafina",
    title: "Dafina",
    kashrutClass: "bassari",
    kcal: 610,
    tags: ["chabbat"],
  }),
  recipe({
    id: "poulet",
    title: "Poulet aux olives",
    kashrutClass: "bassari",
    kcal: 460,
  }),
  recipe({
    id: "boeuf",
    title: "Bœuf aux carottes",
    kashrutClass: "bassari",
    kcal: 520,
  }),
  recipe({ id: "chakchouka", title: "Chakchouka", kcal: 217 }),
  recipe({
    id: "poisson",
    title: "Poisson du dimanche",
    isFish: true,
    kcal: 420,
  }),
  recipe({ id: "thon", title: "Shakshouka au thon", isFish: true, kcal: 310 }),
  recipe({
    id: "gratin",
    title: "Gratin halavi",
    kashrutClass: "halavi",
    kcal: 380,
  }),
  recipe({
    id: "cheesecake",
    title: "Cheesecake de Chavouot",
    kashrutClass: "halavi",
    kcal: 450,
  }),
  recipe({
    id: "mechouia",
    title: "Salade méchouia",
    category: "entree",
    kcal: 119,
  }),
  recipe({
    id: "pain",
    title: "Sandwich fricassé",
    kcal: 430,
    hasHametz: true,
  }),
  recipe({ id: "loubia", title: "Loubia", kcal: 350, hasKitniyot: true }),
];

function ctxFromCalendar(
  weekStart: string,
  calendar: CalendarDay[],
  overrides: Partial<PlanContext> = {},
): PlanContext {
  return {
    weekStart,
    calorieTarget: 2000,
    kashrutEnabled: true,
    shomerShabbat: true,
    meatToDairyWaitHours: 6,
    dairyToMeatWaitHours: 1,
    eatsKitniyot: true,
    pessahDates: new Set(calendar.filter((d) => d.isPessah).map((d) => d.date)),
    fastDates: new Set(calendar.filter((d) => d.isFast).map((d) => d.date)),
    feastDates: new Set(calendar.filter((d) => d.isFeast).map((d) => d.date)),
    chavouotDates: new Set(
      calendar.filter((d) => d.isChavouot).map((d) => d.date),
    ),
    ...overrides,
  };
}

// DoD session 13 — end-to-end scenario: real Pessah 2027 dates flow from the
// engine into the planner context, the fallback plan carries zero hametz and
// passes the validator.
describe("scenario Pessah 2027 (DoD)", () => {
  const weekStart = "2027-04-19"; // Monday; seder Wednesday night, chag Thu-Fri
  const calendar = computeCalendarDays(weekStart, 7, DEFAULT_CALENDAR_SETTINGS);
  const ctx = ctxFromCalendar(weekStart, calendar);

  it("derives the Pessah dates from the engine", () => {
    expect(ctx.pessahDates.has("2027-04-21")).toBe(true); // erev
    expect(ctx.pessahDates.has("2027-04-25")).toBe(true); // chol hamoed
    expect(ctx.pessahDates.has("2027-04-19")).toBe(false);
    expect(ctx.feastDates.has("2027-04-22")).toBe(true); // budget kiff on chag
  });

  it("plans a hametz-free validated week", () => {
    const slots = buildFallbackPlan(POOL, ctx);
    expect(validatePlan(slots, ctx)).toHaveLength(0);
    for (const slot of slots) {
      if (ctx.pessahDates.has(slot.date)) {
        expect(slot.hasHametz).toBe(false);
      }
    }
  });

  it("also excludes kitniyot for a non-kitniyot profile", () => {
    const strictCtx = ctxFromCalendar(weekStart, calendar, {
      eatsKitniyot: false,
    });
    const slots = buildFallbackPlan(POOL, strictCtx);
    expect(validatePlan(slots, strictCtx)).toHaveLength(0);
    for (const slot of slots) {
      if (strictCtx.pessahDates.has(slot.date)) {
        expect(slot.hasKitniyot).toBe(false);
      }
    }
  });

  it("flags a hametz dish manually dropped on a Pessah day", () => {
    const slots = buildFallbackPlan(POOL, ctx).map((slot) =>
      slot.date === "2027-04-22" && slot.meal === "diner"
        ? { ...slot, hasHametz: true, title: "Fricassé pirate" }
        : slot,
    );
    expect(
      validatePlan(slots, ctx).some((v) => v.rule === "pessah_hametz"),
    ).toBe(true);
  });
});

// DoD session 13 — end-to-end scenario: Kippour 2027 (Monday October 11).
describe("scenario Kippour 2027 (DoD)", () => {
  const weekStart = "2027-10-11"; // Kippour is that Monday
  const calendar = computeCalendarDays(weekStart, 7, DEFAULT_CALENDAR_SETTINGS);
  const ctx = ctxFromCalendar(weekStart, calendar);

  it("marks Kippour as a fast and not a budget-kiff day", () => {
    expect(ctx.fastDates.has("2027-10-11")).toBe(true);
    expect(ctx.feastDates.has("2027-10-11")).toBe(false);
    expect(ctx.feastDates.has("2027-10-16")).toBe(true); // Souccot I
  });

  it("plans no daytime meal on Kippour and validates", () => {
    const slots = buildFallbackPlan(POOL, ctx);
    expect(validatePlan(slots, ctx)).toHaveLength(0);
    expect(
      slots.some(
        (slot) =>
          slot.date === "2027-10-11" &&
          (slot.meal === "petit_dej" || slot.meal === "dej"),
      ),
    ).toBe(false);
  });

  it("keeps quiet hours from Kol Nidre to the end of the fast", () => {
    // Sunday Oct 10, 21:00 Paris (after candle lighting) → quiet.
    expect(isQuietTime(new Date("2027-10-10T19:30:00Z"))).toBe(true);
    // Kippour mid-day → still quiet.
    expect(isQuietTime(new Date("2027-10-11T12:00:00Z"))).toBe(true);
    // Tuesday morning → loud again.
    expect(isQuietTime(new Date("2027-10-12T08:00:00Z"))).toBe(false);
  });

  it("tells Kémia it is a fast day with no calorie talk", () => {
    const context = buildCalendarContext(new Date("2027-10-11T10:00:00Z"), {});
    expect(context.isFastToday).toBe(true);
    expect(context.text).toContain("JEÛNE AUJOURD'HUI");
    expect(context.text).toContain("tsom kal");
  });
});

describe("scenario Chavouot — dairy dinner preference", () => {
  // Chavouot 2027 falls on chabbat; use a synthetic mid-week Chavouot to
  // isolate the dairy rule (the chabbat pool takes precedence on Fridays).
  const weekStart = "2027-06-07";
  const calendar = computeCalendarDays(weekStart, 7, DEFAULT_CALENDAR_SETTINGS);
  const ctx = ctxFromCalendar(weekStart, calendar, {
    chavouotDates: new Set([addDays(weekStart, 1)]), // Tuesday
    feastDates: new Set([addDays(weekStart, 1)]),
  });

  it("serves halavi or parvé for the Chavouot dinner", () => {
    const slots = buildFallbackPlan(POOL, ctx);
    expect(validatePlan(slots, ctx)).toHaveLength(0);
    const dinner = slots.find(
      (slot) => slot.date === addDays(weekStart, 1) && slot.meal === "diner",
    );
    expect(dinner).toBeDefined();
    expect(["halavi", "parve"]).toContain(dinner!.kashrutClass);
  });
});
