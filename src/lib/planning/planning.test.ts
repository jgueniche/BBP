import { describe, expect, it } from "vitest";

import { aisleForCategory, needsKosherNote } from "./aisles";
import { buildFallbackPlan } from "./fallback";
import type { PlanContext, PlannerRecipe, PlanSlot } from "./types";
import { validatePlan } from "./validate";
import { addDays, weekStartOf } from "./week";

function ctx(overrides: Partial<PlanContext> = {}): PlanContext {
  return {
    weekStart: "2026-09-07",
    calorieTarget: 2000,
    shomerShabbat: true,
    meatToDairyWaitHours: 6,
    dairyToMeatWaitHours: 1,
    eatsKitniyot: true,
    pessahDates: new Set(),
    fastDates: new Set(),
    ...overrides,
  };
}

function slot(overrides: Partial<PlanSlot>): PlanSlot {
  return {
    date: "2026-09-07",
    meal: "dej",
    recipeId: null,
    title: "Plat test",
    icon: null,
    kashrutClass: "parve",
    isFish: false,
    kcal: 500,
    proteinG: 30,
    timeMin: 30,
    hasHametz: false,
    hasKitniyot: false,
    tags: [],
    isLeftover: false,
    locked: false,
    servings: 1,
    ...overrides,
  };
}

/** A chabbat-Friday + Saturday-lunch pair that satisfies the chabbat rules. */
function chabbatSlots(weekStart: string): PlanSlot[] {
  const friday = addDays(weekStart, 4);
  const saturday = addDays(weekStart, 5);
  return [
    slot({
      date: friday,
      meal: "diner",
      kashrutClass: "bassari",
      tags: ["chabbat"],
      kcal: 700,
    }),
    slot({
      date: saturday,
      meal: "dej",
      kashrutClass: "bassari",
      isLeftover: true,
      kcal: 800,
    }),
  ];
}

describe("validatePlan — kosher rules", () => {
  it("flags dairy served too soon after meat", () => {
    const violations = validatePlan(
      [
        ...chabbatSlots("2026-09-07"),
        slot({ meal: "dej", kashrutClass: "bassari", kcal: 800 }),
        slot({ meal: "diner", kashrutClass: "halavi", kcal: 700 }),
      ],
      ctx({ meatToDairyWaitHours: 8, calorieTarget: null }),
    );
    expect(violations.some((v) => v.rule === "meat_dairy_wait")).toBe(true);
  });

  it("accepts meat lunch then dairy dinner when the wait fits (7.5h gap)", () => {
    const violations = validatePlan(
      [
        ...chabbatSlots("2026-09-07"),
        slot({ meal: "dej", kashrutClass: "bassari", kcal: 800 }),
        slot({ meal: "diner", kashrutClass: "halavi", kcal: 700 }),
      ],
      ctx({ meatToDairyWaitHours: 6, calorieTarget: null }),
    );
    expect(violations).toEqual([]);
  });

  it("requires the chabbat meals when shomer_shabbat", () => {
    const violations = validatePlan([], ctx({ calorieTarget: null }));
    const rules = violations.map((v) => v.rule);
    expect(rules).toContain("chabbat_missing");
    expect(rules.filter((r) => r === "chabbat_missing")).toHaveLength(2);
  });

  it("refuses a Saturday lunch that requires cooking", () => {
    const saturday = addDays("2026-09-07", 5);
    const base = chabbatSlots("2026-09-07").filter((s) => s.date !== saturday);
    const violations = validatePlan(
      [...base, slot({ date: saturday, meal: "dej", kashrutClass: "bassari" })],
      ctx({ calorieTarget: null }),
    );
    expect(violations.some((v) => v.rule === "chabbat_cooking")).toBe(true);
  });

  it("blocks hametz and (per profile) kitniyot during Pessah", () => {
    const pessah = new Set(["2026-09-07"]);
    const hametz = validatePlan(
      [...chabbatSlots("2026-09-07"), slot({ hasHametz: true })],
      ctx({ pessahDates: pessah, calorieTarget: null }),
    );
    expect(hametz.some((v) => v.rule === "pessah_hametz")).toBe(true);

    const kitniyot = [
      ...chabbatSlots("2026-09-07"),
      slot({ hasKitniyot: true }),
    ];
    expect(
      validatePlan(
        kitniyot,
        ctx({ pessahDates: pessah, eatsKitniyot: false, calorieTarget: null }),
      ).some((v) => v.rule === "pessah_kitniyot"),
    ).toBe(true);
    expect(
      validatePlan(
        kitniyot,
        ctx({ pessahDates: pessah, eatsKitniyot: true, calorieTarget: null }),
      ),
    ).toEqual([]);
  });

  it("plans nothing during a fast day", () => {
    const violations = validatePlan(
      [...chabbatSlots("2026-09-07"), slot({ meal: "dej" })],
      ctx({ fastDates: new Set(["2026-09-07"]), calorieTarget: null }),
    );
    expect(violations.some((v) => v.rule === "fast_day")).toBe(true);
  });

  it("checks the ±10% calorie target on the planned share", () => {
    const within = validatePlan(
      [
        ...chabbatSlots("2026-09-07"),
        slot({ meal: "dej", kcal: 750, servings: 1 }),
        slot({ meal: "diner", kcal: 700, servings: 1 }),
      ],
      ctx({ shomerShabbat: false, calorieTarget: 2000 }),
    );
    expect(within.filter((v) => v.date === "2026-09-07")).toEqual([]);

    const outside = validatePlan(
      [
        slot({ meal: "dej", kcal: 300, servings: 1 }),
        slot({ meal: "diner", kcal: 300, servings: 1 }),
      ],
      ctx({ shomerShabbat: false, calorieTarget: 2000 }),
    );
    expect(outside.some((v) => v.rule === "calorie_target")).toBe(true);
  });
});

const POOL: PlannerRecipe[] = [
  {
    id: "1",
    title: "Couscous boulettes",
    icon: "🍲",
    kashrutClass: "bassari",
    isFish: false,
    category: "plat",
    kcal: 572,
    proteinG: 34,
    timeMin: 90,
    hasHametz: true,
    hasKitniyot: false,
    tags: ["chabbat"],
  },
  {
    id: "2",
    title: "Tfina pkaila",
    icon: "🥘",
    kashrutClass: "bassari",
    isFish: false,
    category: "plat",
    kcal: 540,
    proteinG: 32,
    timeMin: 240,
    hasHametz: false,
    hasKitniyot: true,
    tags: ["chabbat"],
  },
  {
    id: "3",
    title: "Poulet aux olives",
    icon: "🍗",
    kashrutClass: "bassari",
    isFish: false,
    category: "plat",
    kcal: 460,
    proteinG: 38,
    timeMin: 60,
    hasHametz: false,
    hasKitniyot: false,
    tags: [],
  },
  {
    id: "4",
    title: "Chakchouka",
    icon: "🍅",
    kashrutClass: "parve",
    isFish: false,
    category: "plat",
    kcal: 217,
    proteinG: 11,
    timeMin: 35,
    hasHametz: false,
    hasKitniyot: false,
    tags: [],
  },
  {
    id: "5",
    title: "Poisson complet du dimanche",
    icon: "🐟",
    kashrutClass: "parve",
    isFish: true,
    category: "plat",
    kcal: 420,
    proteinG: 36,
    timeMin: 45,
    hasHametz: false,
    hasKitniyot: false,
    tags: [],
  },
  {
    id: "6",
    title: "Shakshouka au thon",
    icon: "🐟",
    kashrutClass: "parve",
    isFish: true,
    category: "plat",
    kcal: 310,
    proteinG: 24,
    timeMin: 30,
    hasHametz: false,
    hasKitniyot: false,
    tags: [],
  },
  {
    id: "7",
    title: "Gratin halavi",
    icon: "🧀",
    kashrutClass: "halavi",
    isFish: false,
    category: "plat",
    kcal: 380,
    proteinG: 20,
    timeMin: 50,
    hasHametz: false,
    hasKitniyot: false,
    tags: [],
  },
  {
    id: "8",
    title: "Salade méchouia",
    icon: "🌶️",
    kashrutClass: "parve",
    isFish: false,
    category: "entree",
    kcal: 119,
    proteinG: 3,
    timeMin: 30,
    hasHametz: false,
    hasKitniyot: false,
    tags: [],
  },
  {
    id: "9",
    title: "Loubia",
    icon: "🥣",
    kashrutClass: "parve",
    isFish: false,
    category: "plat",
    kcal: 350,
    proteinG: 18,
    timeMin: 80,
    hasHametz: false,
    hasKitniyot: true,
    tags: [],
  },
  {
    id: "10",
    title: "Dafina",
    icon: "🍖",
    kashrutClass: "bassari",
    isFish: false,
    category: "plat",
    kcal: 610,
    proteinG: 35,
    timeMin: 300,
    hasHametz: false,
    hasKitniyot: false,
    tags: ["chabbat"],
  },
];

describe("buildFallbackPlan — DoD: 10 generated weeks, zero violations", () => {
  it("produces valid kosher plans for 10 different weeks", () => {
    for (let week = 0; week < 10; week += 1) {
      const weekStart = addDays("2026-09-07", week * 7);
      const context = ctx({ weekStart });
      const plan = buildFallbackPlan(POOL, context);
      expect(plan.length).toBeGreaterThanOrEqual(12);
      expect(validatePlan(plan, context)).toEqual([]);
    }
  });

  it("stays valid without a calorie target (mode boutargue)", () => {
    const context = ctx({ calorieTarget: null });
    expect(validatePlan(buildFallbackPlan(POOL, context), context)).toEqual([]);
  });

  it("filters hametz during a Pessah week and skips fast-day lunches", () => {
    const weekStart = "2026-09-07";
    const pessahDates = new Set(
      Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    );
    const context = ctx({ weekStart, pessahDates, eatsKitniyot: false });
    const plan = buildFallbackPlan(POOL, context);
    expect(plan.every((s) => !s.hasHametz && !s.hasKitniyot)).toBe(true);
    expect(validatePlan(plan, context)).toEqual([]);

    const fastCtx = ctx({ fastDates: new Set([addDays(weekStart, 1)]) });
    const fastPlan = buildFallbackPlan(POOL, fastCtx);
    expect(
      fastPlan.some(
        (s) => s.date === addDays(weekStart, 1) && s.meal !== "diner",
      ),
    ).toBe(false);
    expect(validatePlan(fastPlan, fastCtx)).toEqual([]);
  });

  it("reuses leftovers and meal-preps chabbat", () => {
    const context = ctx();
    const plan = buildFallbackPlan(POOL, context);
    const saturdayLunch = plan.find(
      (s) => s.date === addDays(context.weekStart, 5) && s.meal === "dej",
    );
    expect(saturdayLunch?.isLeftover).toBe(true);
    expect(plan.filter((s) => s.isLeftover).length).toBeGreaterThanOrEqual(2);
  });
});

describe("helpers", () => {
  it("weekStartOf returns the Monday", () => {
    expect(weekStartOf("2026-09-09")).toBe("2026-09-07");
    expect(weekStartOf("2026-09-07")).toBe("2026-09-07");
    expect(weekStartOf("2026-09-13")).toBe("2026-09-07");
  });

  it("maps Ciqual categories to aisles", () => {
    expect(
      aisleForCategory("fruits, légumes, légumineuses et oléagineux"),
    ).toBe("Fruits & légumes");
    expect(aisleForCategory("viandes, œufs, poissons et assimilés")).toBe(
      "Boucherie & poissonnerie",
    );
    expect(aisleForCategory("produits laitiers et assimilés")).toBe("Crèmerie");
    expect(aisleForCategory(null)).toBe("Autres");
  });

  it("flags kosher-sensitive products", () => {
    expect(
      needsKosherNote({ kashrutClass: "bassari", label: "épaule d'agneau" }),
    ).toBe(true);
    expect(needsKosherNote({ kashrutClass: null, label: "vin rouge" })).toBe(
      true,
    );
    expect(
      needsKosherNote({ kashrutClass: "parve", label: "semoule fine" }),
    ).toBe(false);
  });
});
