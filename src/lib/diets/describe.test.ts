import { describe, expect, it } from "vitest";

import {
  describeFinding,
  describeRemedy,
  describeRulesForCoach,
} from "./describe";
import { evaluateRecipe } from "./verdict";

describe("describeFinding / describeRemedy", () => {
  it("explains a conflict and its checked swap", () => {
    const verdict = evaluateRecipe(
      [
        { label: "lardons", grams: 200 },
        { label: "pâtes", grams: 400 },
      ],
      { diets: ["halal"], allergens: [], dislikes: [] },
    );
    const finding = verdict!.findings[0]!;
    expect(describeFinding(finding)).toBe("contient du porc");
    expect(describeRemedy(finding)).toBe("Remplace par : lardons de dinde.");
  });

  it("explains a possible allergen to check", () => {
    const verdict = evaluateRecipe(
      [
        { label: "poireaux", grams: 400 },
        { label: "bouillon cube", grams: 250 },
      ],
      { diets: [], allergens: ["celery"], dislikes: [] },
    );
    const finding = verdict!.findings[0]!;
    expect(describeFinding(finding)).toBe("peut contenir allergène (céleri)");
  });
});

describe("describeRulesForCoach", () => {
  it("lists rules, allergies and dislikes in plain French", () => {
    expect(
      describeRulesForCoach({
        diets: ["halal", "gluten_free"],
        allergens: ["tree_nuts"],
        dislikes: ["coriandre"],
      }),
    ).toBe(
      "Règles de cuisine choisies : halal, sans gluten. Allergies à éviter : fruits à coque. N'aime pas : coriandre.",
    );
  });

  it("says when nothing is declared", () => {
    expect(
      describeRulesForCoach({ diets: [], allergens: [], dislikes: [] }),
    ).toBe("Aucune règle de cuisine particulière déclarée.");
  });
});
