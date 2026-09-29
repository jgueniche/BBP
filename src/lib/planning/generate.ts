import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { generateWeekPlanAi } from "@/ai/agents/meal-planner";
import type { Database } from "@/db/types";
import { loadFoodRules } from "@/lib/diets/preferences";
import { verdictStatuses } from "@/lib/diets/recipes";

import { buildFallbackPlan } from "./fallback";
import type { PlanContext, PlannerRecipe, PlanSlot } from "./types";
import { validatePlan } from "./validate";

type Supabase = SupabaseClient<Database>;

const POOL_LIMIT = 80;

export type PlanningData = {
  ctx: PlanContext;
  /** Recipes that suit the person's rules as they are. */
  pool: PlannerRecipe[];
};

const RECIPE_SELECT =
  "id, title, icon, category, prep_min, cook_min, tags, nutrition_per_serving, author_id";

type RecipeRow = {
  id: string;
  title: string;
  icon: string | null;
  category: string | null;
  prep_min: number | null;
  cook_min: number | null;
  tags: string[];
  nutrition_per_serving: unknown;
};

export function toPlannerRecipe(recipe: RecipeRow): PlannerRecipe {
  const nutrition = (recipe.nutrition_per_serving ?? {}) as {
    kcal?: number;
    protein_g?: number;
  };
  return {
    id: recipe.id,
    title: recipe.title,
    icon: recipe.icon,
    category: recipe.category,
    kcal: typeof nutrition.kcal === "number" ? nutrition.kcal : null,
    proteinG:
      typeof nutrition.protein_g === "number" ? nutrition.protein_g : null,
    timeMin:
      recipe.prep_min === null && recipe.cook_min === null
        ? null
        : (recipe.prep_min ?? 0) + (recipe.cook_min ?? 0),
    tags: recipe.tags,
  };
}

async function loadCandidates(
  supabase: Supabase,
  userId: string,
): Promise<PlannerRecipe[]> {
  const [{ data: community }, { data: mine }, { data: saves }] =
    await Promise.all([
      supabase
        .from("recipes")
        .select(RECIPE_SELECT)
        .eq("status", "published")
        .eq("visibility", "community")
        .order("created_at")
        .limit(POOL_LIMIT),
      supabase.from("recipes").select(RECIPE_SELECT).eq("author_id", userId),
      supabase.from("recipe_saves").select("recipe_id").eq("user_id", userId),
    ]);

  const savedIds = (saves ?? []).map((s) => s.recipe_id);
  const { data: saved } =
    savedIds.length > 0
      ? await supabase.from("recipes").select(RECIPE_SELECT).in("id", savedIds)
      : { data: [] };

  const byId = new Map<string, RecipeRow>();
  // The person's own and saved recipes first, then the community.
  for (const recipe of [
    ...(mine ?? []),
    ...(saved ?? []),
    ...(community ?? []),
  ]) {
    byId.set(recipe.id, recipe);
  }
  return [...byId.values()].slice(0, POOL_LIMIT).map(toPlannerRecipe);
}

/** Recipe ids that do not suit the person's rules as they are. */
export async function unsuitableRecipes(
  supabase: Supabase,
  userId: string,
  recipeIds: readonly string[],
): Promise<Set<string>> {
  const rules = await loadFoodRules(supabase, userId);
  const statuses = await verdictStatuses(supabase, rules, recipeIds);
  return new Set(
    [...statuses]
      .filter(([, status]) => status !== "compatible")
      .map(([id]) => id),
  );
}

export async function buildPlanningData(
  supabase: Supabase,
  userId: string,
  weekStart: string,
): Promise<PlanningData> {
  const candidates = await loadCandidates(supabase, userId);
  const unsuitable = await unsuitableRecipes(
    supabase,
    userId,
    candidates.map((r) => r.id),
  );
  return {
    ctx: { weekStart, unsuitable },
    pool: candidates.filter((recipe) => !unsuitable.has(recipe.id)),
  };
}

export type GeneratedPlan = {
  slots: PlanSlot[];
  source: "ai" | "fallback";
  aiFellBack: boolean;
};

function mergeWithLocked(
  generated: PlanSlot[],
  locked: PlanSlot[],
): PlanSlot[] {
  const lockedKeys = new Set(locked.map((s) => `${s.date}|${s.meal}`));
  return [
    ...locked,
    ...generated.filter((s) => !lockedKeys.has(`${s.date}|${s.meal}`)),
  ];
}

/**
 * Generate a validated week: two AI attempts (violations fed back), then the
 * deterministic fallback — the returned plan always passes the validator.
 */
export async function generateValidatedWeek(params: {
  data: PlanningData;
  constraints: string | null;
  lockedSlots: PlanSlot[];
}): Promise<GeneratedPlan> {
  const { data, lockedSlots, constraints } = params;

  let aiTried = false;
  let previousViolations: string[] | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const aiSlots = await generateWeekPlanAi({
      recipes: data.pool,
      weekStart: data.ctx.weekStart,
      constraints,
      previousViolations,
    });
    if (aiSlots === null) break; // no key or hard failure — go to fallback
    aiTried = true;
    const merged = mergeWithLocked(aiSlots, lockedSlots);
    const violations = validatePlan(merged, data.ctx);
    if (violations.length === 0) {
      return { slots: merged, source: "ai", aiFellBack: false };
    }
    previousViolations = violations.map((v) => v.message);
  }

  const fallback = mergeWithLocked(
    buildFallbackPlan(data.pool, data.ctx),
    lockedSlots,
  );
  return { slots: fallback, source: "fallback", aiFellBack: aiTried };
}

export const MAX_GENERATIONS_PER_WEEK = 20;

export async function getOrCreatePlan(
  supabase: Supabase,
  userId: string,
  weekStart: string,
) {
  const { data: existing } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (existing) return existing;
  const { data: created, error } = await supabase
    .from("meal_plans")
    .insert({ user_id: userId, week_start: weekStart })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export function slotToRow(slot: PlanSlot, planId: string) {
  return {
    plan_id: planId,
    date: slot.date,
    meal: slot.meal,
    recipe_id: slot.recipeId,
    title: slot.title,
    icon: slot.icon,
    kcal: slot.kcal,
    protein_g: slot.proteinG,
    time_min: slot.timeMin,
    tags: slot.tags,
    is_leftover: slot.isLeftover,
    locked: slot.locked,
    servings: slot.servings,
  };
}

type SlotRow = Database["public"]["Tables"]["meal_plan_slots"]["Row"];

export function rowToSlot(row: SlotRow): PlanSlot {
  return {
    date: row.date,
    meal: row.meal as PlanSlot["meal"],
    recipeId: row.recipe_id,
    title: row.title,
    icon: row.icon,
    kcal: row.kcal,
    proteinG: row.protein_g,
    timeMin: row.time_min,
    tags: row.tags,
    isLeftover: row.is_leftover,
    locked: row.locked,
    servings: row.servings,
  };
}

export type StoredGeneration =
  | {
      ok: true;
      source: "ai" | "fallback";
      aiFellBack: boolean;
      mealsPlanned: number;
    }
  | { ok: false; code: "quota" | "empty_pool" };

/** Full generate-validate-persist cycle, shared by the page action and the assistant. */
export async function generateAndStoreWeek(
  supabase: Supabase,
  userId: string,
  weekStart: string,
  constraints: string | null,
): Promise<StoredGeneration> {
  const plan = await getOrCreatePlan(supabase, userId, weekStart);
  if (plan.generation_count >= MAX_GENERATIONS_PER_WEEK) {
    return { ok: false, code: "quota" };
  }

  const { data: lockedRows } = await supabase
    .from("meal_plan_slots")
    .select("*")
    .eq("plan_id", plan.id)
    .eq("locked", true);
  const lockedSlots = (lockedRows ?? []).map(rowToSlot);

  const data = await buildPlanningData(supabase, userId, weekStart);
  if (data.pool.length < 4) return { ok: false, code: "empty_pool" };

  const generated = await generateValidatedWeek({
    data,
    constraints,
    lockedSlots,
  });

  await supabase
    .from("meal_plan_slots")
    .delete()
    .eq("plan_id", plan.id)
    .eq("locked", false);
  const inserts = generated.slots
    .filter((slot) => !slot.locked)
    .map((slot) => slotToRow(slot, plan.id));
  if (inserts.length > 0) {
    const { error } = await supabase.from("meal_plan_slots").insert(inserts);
    if (error) throw new Error(error.message);
  }
  await supabase
    .from("meal_plans")
    .update({ generation_count: plan.generation_count + 1 })
    .eq("id", plan.id);

  return {
    ok: true,
    source: generated.source,
    aiFellBack: generated.aiFellBack,
    mealsPlanned: generated.slots.length,
  };
}
