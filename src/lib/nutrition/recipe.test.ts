import { describe, expect, it } from "vitest";

import { computeRecipeNutrition } from "./recipe";

describe("computeRecipeNutrition", () => {
  it("sums per-100g values by grams and divides by servings", () => {
    const result = computeRecipeNutrition(
      [
        { grams: 200, per_100g: { kcal: 100, protein_g: 10 } },
        { grams: 100, per_100g: { kcal: 300, protein_g: 5 } },
      ],
      2,
    );
    expect(result.kcal).toBe(250);
    expect(result.protein_g).toBe(12.5);
  });

  it("ignores ingredients without grams", () => {
    const result = computeRecipeNutrition(
      [
        { grams: null, per_100g: { kcal: 900 } },
        { grams: 100, per_100g: { kcal: 100 } },
      ],
      1,
    );
    expect(result.kcal).toBe(100);
  });

  // DoD session 7: coherence check against reference values (±10 %) using the
  // seeded slata mechouia composition (per-100g figures from Ciqual).
  it("matches the mechouia reference within 10%", () => {
    const result = computeRecipeNutrition(
      [
        { grams: 500, per_100g: {} }, // poivron vert cuit (kcal absent de Ciqual)
        { grams: 400, per_100g: { kcal: 19.3 } }, // tomate crue
        { grams: 10, per_100g: { kcal: 111.0 } }, // ail
        { grams: 37, per_100g: { kcal: 900.0 } }, // huile d'olive
        { grams: 30, per_100g: { kcal: 27.6 } }, // citron
        { grams: 30, per_100g: { kcal: 155.0 } }, // olives
      ],
      4,
    );
    const reference = 119;
    expect(Math.abs(result.kcal! - reference) / reference).toBeLessThan(0.1);
  });
});
