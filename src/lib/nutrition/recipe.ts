import { NUTRIENT_KEYS, type Totals } from "./items";

export type RecipeIngredientNutrition = {
  grams: number | null;
  per_100g: Record<string, number>;
};

export function computeRecipeNutrition(
  ingredients: RecipeIngredientNutrition[],
  servings: number,
): Totals {
  const totals: Record<string, number> = {};
  for (const ingredient of ingredients) {
    if (!ingredient.grams) continue;
    const factor = ingredient.grams / 100;
    for (const key of NUTRIENT_KEYS) {
      const value = ingredient.per_100g[key];
      if (typeof value === "number") {
        totals[key] = (totals[key] ?? 0) + value * factor;
      }
    }
  }
  const perServing: Totals = {};
  const divisor = Math.max(1, servings);
  for (const [key, value] of Object.entries(totals)) {
    perServing[key as keyof Totals] = Math.round((value / divisor) * 10) / 10;
  }
  return perServing;
}
