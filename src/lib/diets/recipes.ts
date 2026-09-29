import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";

import type { EngineIngredient, FoodRules } from "./types";
import { evaluateRecipe, type VerdictStatus } from "./verdict";

// PostgREST caps a response at 1 000 rows: ask for a few recipes at a time.
const CHUNK = 40;

/** Ingredients (label, grams, linked food name) of many recipes, by id. */
export async function loadRecipeIngredients(
  supabase: SupabaseClient<Database>,
  recipeIds: readonly string[],
): Promise<Map<string, EngineIngredient[]>> {
  const ids = [...new Set(recipeIds)];
  const byRecipe = new Map<string, EngineIngredient[]>(
    ids.map((id) => [id, []]),
  );
  if (ids.length === 0) return byRecipe;

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    chunks.push(ids.slice(i, i + CHUNK));
  }
  const results = await Promise.all(
    chunks.map((chunk) =>
      supabase
        .from("recipe_ingredients")
        .select("recipe_id, label_raw, grams, food_id, position")
        .in("recipe_id", chunk)
        .order("position"),
    ),
  );
  const rows = results.flatMap((result) => result.data ?? []);

  const foodIds = [
    ...new Set(
      rows.map((r) => r.food_id).filter((id): id is string => id !== null),
    ),
  ];
  const foodName = new Map<string, string>();
  for (let i = 0; i < foodIds.length; i += 200) {
    const { data } = await supabase
      .from("foods")
      .select("id, name_fr")
      .in("id", foodIds.slice(i, i + 200));
    for (const food of data ?? []) foodName.set(food.id, food.name_fr);
  }

  for (const row of rows) {
    byRecipe.get(row.recipe_id)?.push({
      label: row.label_raw,
      grams: row.grams,
      foodName: row.food_id ? (foodName.get(row.food_id) ?? null) : null,
    });
  }
  return byRecipe;
}

/** Verdict status per recipe for the viewer's rules (empty without rules). */
export async function verdictStatuses(
  supabase: SupabaseClient<Database>,
  rules: FoodRules | null,
  recipeIds: readonly string[],
): Promise<Map<string, VerdictStatus>> {
  const statuses = new Map<string, VerdictStatus>();
  if (!rules || recipeIds.length === 0) return statuses;
  const ingredients = await loadRecipeIngredients(supabase, recipeIds);
  for (const [id, list] of ingredients) {
    const verdict = evaluateRecipe(list, rules);
    if (verdict) statuses.set(id, verdict.status);
  }
  return statuses;
}
