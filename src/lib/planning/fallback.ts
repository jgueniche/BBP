import type { PlanContext, PlanMeal, PlannerRecipe, PlanSlot } from "./types";
import { addDays } from "./week";

/** Deterministic seed from the week so each week gets a different rotation. */
function weekSeed(weekStart: string): number {
  let hash = 0;
  for (const char of weekStart) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100_000;
  }
  return hash;
}

export function slotFromRecipe(
  recipe: PlannerRecipe,
  date: string,
  meal: PlanMeal,
  isLeftover = false,
): PlanSlot {
  return {
    date,
    meal,
    recipeId: recipe.id,
    title: recipe.title,
    icon: recipe.icon,
    kcal: recipe.kcal,
    proteinG: recipe.proteinG,
    timeMin: recipe.timeMin,
    tags: recipe.tags,
    isLeftover,
    locked: false,
    servings: 1,
  };
}

function suitable(pool: PlannerRecipe[], ctx: PlanContext): PlannerRecipe[] {
  return pool.filter((recipe) => !ctx.unsuitable.has(recipe.id));
}

/** Pick a replacement for one slot (regenerate / degraded swap). */
export function pickReplacementSlot(
  pool: PlannerRecipe[],
  ctx: PlanContext,
  date: string,
  meal: PlanMeal,
  excludeRecipeId: string | null,
  rotation: number,
): PlanSlot | null {
  const candidates = suitable(pool, ctx).filter(
    (recipe) => recipe.id !== excludeRecipeId,
  );
  if (candidates.length === 0) return null;
  return slotFromRecipe(candidates[rotation % candidates.length], date, meal);
}

/**
 * Deterministic no-AI weekly planner: lunch and dinner every day from the
 * recipes that suit the person's rules, Tuesday's dinner comes back as
 * Wednesday's lunch (leftovers), one portion each. Zero validator violations
 * by construction.
 */
export function buildFallbackPlan(
  pool: PlannerRecipe[],
  ctx: PlanContext,
): PlanSlot[] {
  const usable = suitable(pool, ctx);
  if (usable.length === 0) return [];
  const seed = weekSeed(ctx.weekStart);
  const slots: PlanSlot[] = [];
  let lunchIndex = seed;
  let dinnerIndex = seed * 3 + 1;
  let previousDinner: PlannerRecipe | null = null;

  for (let day = 0; day < 7; day += 1) {
    const date = addDays(ctx.weekStart, day);
    if (day === 2 && previousDinner) {
      slots.push(slotFromRecipe(previousDinner, date, "dej", true));
    } else {
      slots.push(
        slotFromRecipe(usable[lunchIndex % usable.length], date, "dej"),
      );
      lunchIndex += 1;
    }
    const dinner = usable[dinnerIndex % usable.length];
    dinnerIndex += 1;
    slots.push(slotFromRecipe(dinner, date, "diner"));
    previousDinner = dinner;
  }
  return slots;
}
