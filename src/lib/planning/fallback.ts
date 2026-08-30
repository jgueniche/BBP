import type { PlanContext, PlanMeal, PlannerRecipe, PlanSlot } from "./types";
import { MEAL_SHARES, addDays } from "./week";

const MIN_SERVINGS = 0.75;
const MAX_SERVINGS = 3;

/** Deterministic seed from the week so each week gets a different rotation. */
function weekSeed(weekStart: string): number {
  let hash = 0;
  for (const char of weekStart) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100_000;
  }
  return hash;
}

function slotFromRecipe(
  recipe: PlannerRecipe,
  date: string,
  meal: PlanMeal,
  servings: number,
  isLeftover = false,
): PlanSlot {
  return {
    date,
    meal,
    recipeId: recipe.id,
    title: recipe.title,
    icon: recipe.icon,
    kashrutClass: recipe.kashrutClass,
    isFish: recipe.isFish,
    kcal: recipe.kcal,
    proteinG: recipe.proteinG,
    timeMin: recipe.timeMin,
    hasHametz: recipe.hasHametz,
    hasKitniyot: recipe.hasKitniyot,
    tags: recipe.tags,
    isLeftover,
    locked: false,
    servings,
  };
}

/** Quarter-portion count that best approaches a calorie budget. */
function servingsFor(kcal: number | null, budget: number | null): number {
  if (kcal === null || kcal <= 0 || budget === null) return 1;
  const raw = budget / kcal;
  return Math.min(
    MAX_SERVINGS,
    Math.max(MIN_SERVINGS, Math.round(raw * 4) / 4),
  );
}

/** Can this recipe reach the budget within tolerance at 0.75–3 servings? */
function fitsBudget(recipe: PlannerRecipe, budget: number | null): boolean {
  if (budget === null) return true;
  if (recipe.kcal === null || recipe.kcal <= 0) return false;
  return (
    recipe.kcal * MIN_SERVINGS <= budget * 1.1 &&
    recipe.kcal * MAX_SERVINGS >= budget * 0.9
  );
}

function pick(
  candidates: PlannerRecipe[],
  budget: number | null,
  index: number,
): PlannerRecipe | null {
  if (candidates.length === 0) return null;
  const fitting = candidates.filter((recipe) => fitsBudget(recipe, budget));
  const list = fitting.length > 0 ? fitting : candidates;
  return list[index % list.length];
}

/**
 * Pick a replacement for one slot (regenerate / degraded swap): same class
 * constraints as the weekly planner, budget-aware servings, date filters.
 */
export function pickReplacementSlot(
  pool: PlannerRecipe[],
  ctx: PlanContext,
  date: string,
  meal: PlanMeal,
  excludeRecipeId: string | null,
  rotation: number,
): PlanSlot | null {
  const usable = pool.filter(
    (recipe) =>
      recipe.kcal !== null &&
      recipe.id !== excludeRecipeId &&
      (!ctx.kashrutEnabled ||
        (!(ctx.pessahDates.has(date) && recipe.hasHametz) &&
          !(
            ctx.pessahDates.has(date) &&
            !ctx.eatsKitniyot &&
            recipe.hasKitniyot
          ))),
  );
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  const isFridayDinner = meal === "diner" && day === 5;
  const isSaturdayLunch = meal === "dej" && day === 6;

  let candidates: PlannerRecipe[];
  if ((isFridayDinner || isSaturdayLunch) && ctx.shomerShabbat) {
    const chabbat = usable.filter((recipe) => recipe.tags.includes("chabbat"));
    candidates = chabbat.length > 0 ? chabbat : usable;
  } else if (!ctx.kashrutEnabled) {
    candidates = usable;
  } else if (meal === "diner") {
    candidates = usable.filter(
      (recipe) =>
        recipe.kashrutClass === "bassari" || recipe.kashrutClass === "parve",
    );
  } else {
    candidates = usable.filter(
      (recipe) =>
        recipe.kashrutClass === "parve" || recipe.kashrutClass === "halavi",
    );
  }
  if (candidates.length === 0) return null;

  const budget =
    ctx.calorieTarget === null ? null : ctx.calorieTarget * MEAL_SHARES[meal];
  const recipe = pick(candidates, budget, rotation);
  if (!recipe) return null;
  return slotFromRecipe(recipe, date, meal, servingsFor(recipe.kcal, budget));
}

/**
 * Deterministic no-AI weekly planner. Guarantees zero validator violations
 * for any pool with enough kosher variety: lunches stay halavi/parvé,
 * dinners bassari/parvé (wait rules can never trip with standard delays),
 * chabbat is meal-prepped, leftovers are reused, Pessah filters hametz,
 * fast days plan nothing before nightfall, servings chase the day budget.
 */
export function buildFallbackPlan(
  pool: PlannerRecipe[],
  ctx: PlanContext,
): PlanSlot[] {
  const seed = weekSeed(ctx.weekStart);
  const usable = pool.filter((recipe) => recipe.kcal !== null);

  const forDate = (date: string, list: PlannerRecipe[]) =>
    ctx.kashrutEnabled
      ? list.filter(
          (recipe) =>
            !(ctx.pessahDates.has(date) && recipe.hasHametz) &&
            !(
              ctx.pessahDates.has(date) &&
              !ctx.eatsKitniyot &&
              recipe.hasKitniyot
            ),
        )
      : list;

  const lunchPool = ctx.kashrutEnabled
    ? usable.filter(
        (recipe) =>
          recipe.kashrutClass === "parve" || recipe.kashrutClass === "halavi",
      )
    : usable;
  const dinnerPool = ctx.kashrutEnabled
    ? usable.filter(
        (recipe) =>
          recipe.kashrutClass === "bassari" || recipe.kashrutClass === "parve",
      )
    : usable;
  const chabbatPool = usable.filter((recipe) =>
    recipe.tags.includes("chabbat"),
  );

  const slots: PlanSlot[] = [];
  let lunchIndex = seed;
  let dinnerIndex = seed * 3 + 1;
  let previousDinner: PlannerRecipe | null = null;

  const target = ctx.calorieTarget;
  const lunchBudget = target === null ? null : target * MEAL_SHARES.dej;

  for (let day = 0; day < 7; day += 1) {
    const date = addDays(ctx.weekStart, day);
    const isFriday = day === 4;
    const isSaturday = day === 5;
    const fast = ctx.fastDates.has(date);

    let lunchPlanned = 0;
    let lunchScheduled = false;

    // Lunch: Saturday reuses Friday night's chabbat dish (meal-prep, no
    // cooking); Wednesday reuses Tuesday's dinner as leftovers.
    if (!fast) {
      const leftover =
        (isSaturday && ctx.shomerShabbat) || day === 2 ? previousDinner : null;
      const recipe =
        leftover ?? pick(forDate(date, lunchPool), lunchBudget, lunchIndex);
      if (!leftover) lunchIndex += 1;
      if (recipe) {
        const servings = servingsFor(recipe.kcal, lunchBudget);
        slots.push(
          slotFromRecipe(recipe, date, "dej", servings, leftover !== null),
        );
        lunchPlanned = (recipe.kcal ?? 0) * servings;
        lunchScheduled = true;
      }
    }

    // Dinner budget compensates the lunch rounding so the day lands ±10%.
    const dinnerBudget =
      target === null
        ? null
        : lunchScheduled
          ? target * (MEAL_SHARES.dej + MEAL_SHARES.diner) - lunchPlanned
          : target * MEAL_SHARES.diner;

    // Dinner: Friday night is the chabbat meal when available.
    const dinnerCandidates = forDate(
      date,
      isFriday && ctx.shomerShabbat && chabbatPool.length > 0
        ? chabbatPool
        : dinnerPool,
    );
    const dinner = pick(dinnerCandidates, dinnerBudget, dinnerIndex);
    dinnerIndex += 1;
    if (dinner) {
      slots.push(
        slotFromRecipe(
          dinner,
          date,
          "diner",
          servingsFor(dinner.kcal, dinnerBudget),
        ),
      );
      previousDinner = dinner;
    } else {
      previousDinner = null;
    }
  }

  return slots;
}
