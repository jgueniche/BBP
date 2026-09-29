import { describe, expect, it } from "vitest";

import type { EngineIngredient, FoodRules } from "@/lib/diets/types";
import { evaluateRecipe, isPlannable } from "@/lib/diets/verdict";

import { aisleForCategory } from "./aisles";
import { buildFallbackPlan, pickReplacementSlot } from "./fallback";
import type { PlanContext, PlannerRecipe, PlanSlot } from "./types";
import { validatePlan } from "./validate";
import { addDays, weekStartOf } from "./week";

function recipe(id: string, title = id): PlannerRecipe {
  return {
    id,
    title,
    icon: null,
    category: "plat",
    kcal: 450,
    proteinG: 20,
    timeMin: 40,
    tags: [],
  };
}

function slot(overrides: Partial<PlanSlot>): PlanSlot {
  return {
    date: "2026-09-28",
    meal: "dej",
    recipeId: "r1",
    title: "Plat test",
    icon: null,
    kcal: 500,
    proteinG: 30,
    timeMin: 30,
    tags: [],
    isLeftover: false,
    locked: false,
    servings: 1,
    ...overrides,
  };
}

const ctx = (unsuitable: string[] = []): PlanContext => ({
  weekStart: "2026-09-28",
  unsuitable: new Set(unsuitable),
});

// A small catalogue, judged by the real diet engine (vegetarian + gluten free).
const CATALOGUE: Array<{
  recipe: PlannerRecipe;
  ingredients: EngineIngredient[];
}> = [
  {
    recipe: recipe("ratatouille"),
    ingredients: [
      { label: "courgettes", grams: 400 },
      { label: "aubergines", grams: 400 },
      { label: "tomates", grams: 400 },
    ],
  },
  {
    recipe: recipe("dal"),
    ingredients: [
      { label: "lentilles corail", grams: 300 },
      { label: "lait de coco", grams: 400 },
    ],
  },
  {
    recipe: recipe("chili"),
    ingredients: [
      { label: "haricots rouges", grams: 500 },
      { label: "maïs", grams: 200 },
      { label: "tomates", grams: 400 },
    ],
  },
  {
    recipe: recipe("tortilla"),
    ingredients: [
      { label: "œufs", grams: 300 },
      { label: "pommes de terre", grams: 600 },
    ],
  },
  {
    recipe: recipe("risotto"),
    ingredients: [
      { label: "riz arborio", grams: 350 },
      { label: "champignons", grams: 400 },
      { label: "parmesan", grams: 60 },
    ],
  },
  {
    recipe: recipe("quiche"),
    ingredients: [
      { label: "pâte brisée", grams: 250 },
      { label: "lardons", grams: 200 },
      { label: "crème", grams: 200 },
    ],
  },
  {
    recipe: recipe("poulet"),
    ingredients: [
      { label: "poulet", grams: 1200 },
      { label: "olives", grams: 150 },
    ],
  },
  {
    recipe: recipe("taboule"),
    ingredients: [
      { label: "boulgour", grams: 250 },
      { label: "persil", grams: 100 },
    ],
  },
];

describe("validatePlan — cooking rules", () => {
  it("accepts a plan of suitable recipes", () => {
    expect(validatePlan([slot({}), slot({ meal: "diner" })], ctx())).toEqual(
      [],
    );
  });

  it("flags a recipe that does not suit the rules", () => {
    const violations = validatePlan(
      [slot({ recipeId: "quiche", title: "Quiche" })],
      ctx(["quiche"]),
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("cooking_rules");
    expect(violations[0]?.message).toContain("Quiche");
  });

  it("ignores free-text slots", () => {
    expect(validatePlan([slot({ recipeId: null })], ctx(["x"]))).toEqual([]);
  });
});

describe("buildFallbackPlan — DoD: 10 generated weeks, zero violations", () => {
  const rules: FoodRules = {
    diets: ["vegetarian", "gluten_free"],
    allergens: [],
    dislikes: [],
  };
  const unsuitable = CATALOGUE.filter(
    ({ ingredients }) => !isPlannable(evaluateRecipe(ingredients, rules)),
  ).map(({ recipe: r }) => r.id);
  const pool = CATALOGUE.map(({ recipe: r }) => r);

  it("judges the catalogue with the diet engine", () => {
    expect(unsuitable.sort()).toEqual(["poulet", "quiche", "taboule"]);
  });

  it("plans 10 different weeks with only suitable recipes", () => {
    for (let week = 0; week < 10; week += 1) {
      const weekStart = addDays("2026-09-28", week * 7);
      const context: PlanContext = {
        weekStart,
        unsuitable: new Set(unsuitable),
      };
      const plan = buildFallbackPlan(pool, context);
      expect(plan).toHaveLength(14);
      expect(validatePlan(plan, context)).toEqual([]);
      expect(plan.every((s) => !unsuitable.includes(s.recipeId ?? ""))).toBe(
        true,
      );
    }
  });

  it("reuses Tuesday's dinner as Wednesday's lunch, one portion each", () => {
    const plan = buildFallbackPlan(pool, ctx(unsuitable));
    const tuesdayDinner = plan.find(
      (s) => s.date === addDays("2026-09-28", 1) && s.meal === "diner",
    );
    const wednesdayLunch = plan.find(
      (s) => s.date === addDays("2026-09-28", 2) && s.meal === "dej",
    );
    expect(wednesdayLunch?.isLeftover).toBe(true);
    expect(wednesdayLunch?.recipeId).toBe(tuesdayDinner?.recipeId);
    expect(plan.every((s) => s.servings === 1)).toBe(true);
  });

  it("plans nothing when no recipe suits the rules", () => {
    expect(buildFallbackPlan(pool, ctx(pool.map((r) => r.id)))).toEqual([]);
  });

  it("replaces a slot with another suitable recipe", () => {
    const replacement = pickReplacementSlot(
      pool,
      ctx(unsuitable),
      "2026-09-28",
      "diner",
      "dal",
      3,
    );
    expect(replacement?.recipeId).not.toBe("dal");
    expect(unsuitable).not.toContain(replacement?.recipeId);
  });
});

describe("helpers", () => {
  it("weekStartOf returns the Monday", () => {
    expect(weekStartOf("2026-10-01")).toBe("2026-09-28");
    expect(weekStartOf("2026-09-27")).toBe("2026-09-21");
  });

  it("maps Ciqual categories to aisles", () => {
    expect(
      aisleForCategory("fruits, légumes, légumineuses et oléagineux"),
    ).toBe("Fruits & légumes");
    expect(aisleForCategory(null)).toBe("Autres");
  });
});
