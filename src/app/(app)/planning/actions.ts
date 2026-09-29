"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { loadFoodRules } from "@/lib/diets/preferences";
import { verdictStatuses } from "@/lib/diets/recipes";
import type { VerdictStatus } from "@/lib/diets/verdict";
import { DEFAULT_AISLE, aisleForCategory } from "@/lib/planning/aisles";
import { pickReplacementSlot } from "@/lib/planning/fallback";
import {
  buildPlanningData,
  generateAndStoreWeek,
  getOrCreatePlan,
  rowToSlot,
  slotToRow,
  toPlannerRecipe,
  unsuitableRecipes,
} from "@/lib/planning/generate";
import type { PlanMeal, PlanSlot } from "@/lib/planning/types";
import { validatePlan } from "@/lib/planning/validate";
import { weekStartOf } from "@/lib/planning/week";
import { createClient } from "@/lib/supabase/server";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const mealSchema = z.enum(["petit_dej", "dej", "diner"]);

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

/** New violations only — pre-existing ones must not block unrelated edits. */
function newViolationMessages(
  before: ReturnType<typeof validatePlan>,
  after: ReturnType<typeof validatePlan>,
): string[] {
  const known = new Set(before.map((v) => `${v.date}|${v.rule}|${v.message}`));
  return after
    .filter((v) => !known.has(`${v.date}|${v.rule}|${v.message}`))
    .map((v) => v.message);
}

export async function generateWeek(rawWeekStart: string, constraints?: string) {
  const weekStart = weekStartOf(dateSchema.parse(rawWeekStart));
  const { supabase, user } = await requireUser();
  const result = await generateAndStoreWeek(
    supabase,
    user.id,
    weekStart,
    constraints?.trim() || null,
  );
  revalidatePath("/planning");
  return result;
}

async function recipeSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recipeId: string,
): Promise<Omit<
  PlanSlot,
  "date" | "meal" | "isLeftover" | "locked" | "servings"
> | null> {
  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      "id, title, icon, category, prep_min, cook_min, tags, nutrition_per_serving",
    )
    .eq("id", recipeId)
    .maybeSingle();
  if (!recipe) return null;
  const planner = toPlannerRecipe(recipe);
  return {
    recipeId: planner.id,
    title: planner.title,
    icon: planner.icon,
    kcal: planner.kcal,
    proteinG: planner.proteinG,
    timeMin: planner.timeMin,
    tags: planner.tags,
  };
}

export async function setSlotRecipe(params: {
  weekStart: string;
  date: string;
  meal: PlanMeal;
  recipeId: string;
  servings?: number;
}) {
  const weekStart = weekStartOf(dateSchema.parse(params.weekStart));
  const date = dateSchema.parse(params.date);
  const meal = mealSchema.parse(params.meal);
  const recipeId = z.uuid().parse(params.recipeId);
  const servings = Math.min(4, Math.max(0.25, params.servings ?? 1));
  const { supabase, user } = await requireUser();

  const plan = await getOrCreatePlan(supabase, user.id, weekStart);
  const snapshot = await recipeSnapshot(supabase, recipeId);
  if (!snapshot) return { ok: false as const, violations: [] };

  const { data: rows } = await supabase
    .from("meal_plan_slots")
    .select("*")
    .eq("plan_id", plan.id);
  const slots = (rows ?? []).map(rowToSlot);
  const candidate: PlanSlot = {
    ...snapshot,
    date,
    meal,
    isLeftover: false,
    locked: false,
    servings,
  };

  const ctx = {
    weekStart,
    unsuitable: await unsuitableRecipes(supabase, user.id, [recipeId]),
  };
  const blocking = newViolationMessages(
    validatePlan(slots, ctx),
    validatePlan(
      [
        ...slots.filter((s) => !(s.date === date && s.meal === meal)),
        candidate,
      ],
      ctx,
    ),
  );
  if (blocking.length > 0) {
    return { ok: false as const, violations: blocking };
  }

  await supabase
    .from("meal_plan_slots")
    .delete()
    .eq("plan_id", plan.id)
    .eq("date", date)
    .eq("meal", meal);
  const { error } = await supabase
    .from("meal_plan_slots")
    .insert(slotToRow(candidate, plan.id));
  if (error) throw new Error(error.message);

  revalidatePath("/planning");
  return { ok: true as const, violations: [] };
}

export async function regenerateSlot(slotId: string) {
  const id = z.uuid().parse(slotId);
  const { supabase, user } = await requireUser();

  const { data: row } = await supabase
    .from("meal_plan_slots")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false as const };
  const { data: plan } = await supabase
    .from("meal_plans")
    .select("week_start")
    .eq("id", row.plan_id)
    .maybeSingle();
  if (!plan) return { ok: false as const };
  const weekStart = plan.week_start;

  const data = await buildPlanningData(supabase, user.id, weekStart);
  const { data: allRows } = await supabase
    .from("meal_plan_slots")
    .select("*")
    .eq("plan_id", row.plan_id);
  const others = (allRows ?? []).filter((r) => r.id !== id).map(rowToSlot);
  const before = validatePlan([...others, rowToSlot(row)], data.ctx);

  const rotationBase = Math.floor(Math.random() * 97);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const replacement = pickReplacementSlot(
      data.pool,
      data.ctx,
      row.date,
      row.meal as PlanMeal,
      row.recipe_id,
      rotationBase + attempt,
    );
    if (!replacement) break;
    const after = validatePlan([...others, replacement], data.ctx);
    if (newViolationMessages(before, after).length > 0) continue;
    const { error } = await supabase
      .from("meal_plan_slots")
      .update({
        ...slotToRow(replacement, row.plan_id),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/planning");
    return { ok: true as const };
  }
  return { ok: false as const };
}

export async function moveSlot(params: {
  slotId: string;
  toDate: string;
  toMeal: PlanMeal;
}) {
  const id = z.uuid().parse(params.slotId);
  const toDate = dateSchema.parse(params.toDate);
  const toMeal = mealSchema.parse(params.toMeal);
  const { supabase } = await requireUser();

  const { data: row } = await supabase
    .from("meal_plan_slots")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false as const, violations: [] };
  if (row.date === toDate && row.meal === toMeal) {
    return { ok: true as const, violations: [] };
  }
  const { data: allRows } = await supabase
    .from("meal_plan_slots")
    .select("*")
    .eq("plan_id", row.plan_id);
  const target = (allRows ?? []).find(
    (r) => r.date === toDate && r.meal === toMeal,
  );
  const movedA: PlanSlot = { ...rowToSlot(row), date: toDate, meal: toMeal };

  // Cooking rules judge recipes, not days: moving a slot cannot break them.
  // Respect the (plan, date, meal) unique constraint: clear, then rewrite.
  await supabase.from("meal_plan_slots").delete().eq("id", id);
  if (target) {
    await supabase
      .from("meal_plan_slots")
      .update({ date: row.date, meal: row.meal })
      .eq("id", target.id);
  }
  const { error } = await supabase
    .from("meal_plan_slots")
    .insert(slotToRow(movedA, row.plan_id));
  if (error) throw new Error(error.message);

  revalidatePath("/planning");
  return { ok: true as const, violations: [] };
}

export async function clearSlot(slotId: string) {
  const id = z.uuid().parse(slotId);
  const { supabase } = await requireUser();
  await supabase.from("meal_plan_slots").delete().eq("id", id);
  revalidatePath("/planning");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Shopping list
// ---------------------------------------------------------------------------

export async function generateShoppingList(rawWeekStart: string) {
  const weekStart = weekStartOf(dateSchema.parse(rawWeekStart));
  const { supabase, user } = await requireUser();
  const plan = await getOrCreatePlan(supabase, user.id, weekStart);

  const { data: slots } = await supabase
    .from("meal_plan_slots")
    .select("recipe_id, is_leftover")
    .eq("plan_id", plan.id);
  const recipeIds = [
    ...new Set(
      (slots ?? [])
        .filter((slot) => !slot.is_leftover && slot.recipe_id !== null)
        .map((slot) => slot.recipe_id as string),
    ),
  ];
  if (recipeIds.length === 0) {
    await supabase.from("shopping_items").delete().eq("plan_id", plan.id);
    revalidatePath("/planning/courses");
    return { ok: true as const, count: 0 };
  }

  const { data: ingredients } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id, food_id, label_raw, grams")
    .in("recipe_id", recipeIds);
  const foodIds = [
    ...new Set(
      (ingredients ?? [])
        .map((i) => i.food_id)
        .filter((id): id is string => id !== null),
    ),
  ];
  const { data: foods } =
    foodIds.length > 0
      ? await supabase
          .from("foods")
          .select("id, name_fr, category")
          .in("id", foodIds)
      : { data: [] };
  const foodById = new Map((foods ?? []).map((f) => [f.id, f]));

  type Aggregate = {
    label: string;
    grams: number | null;
    aisle: string;
  };
  const byKey = new Map<string, Aggregate>();
  for (const ingredient of ingredients ?? []) {
    const food = ingredient.food_id
      ? foodById.get(ingredient.food_id)
      : undefined;
    const label = food?.name_fr ?? ingredient.label_raw;
    const key = ingredient.food_id ?? label.toLowerCase();
    const current = byKey.get(key);
    if (current) {
      if (ingredient.grams !== null) {
        current.grams = (current.grams ?? 0) + ingredient.grams;
      }
    } else {
      byKey.set(key, {
        label,
        grams: ingredient.grams,
        aisle: food ? aisleForCategory(food.category) : DEFAULT_AISLE,
      });
    }
  }

  const items = [...byKey.values()].sort(
    (a, b) => a.aisle.localeCompare(b.aisle) || a.label.localeCompare(b.label),
  );
  await supabase.from("shopping_items").delete().eq("plan_id", plan.id);
  if (items.length > 0) {
    const { error } = await supabase.from("shopping_items").insert(
      items.map((item, position) => ({
        plan_id: plan.id,
        label: item.label,
        grams: item.grams === null ? null : Math.round(item.grams),
        aisle: item.aisle,
        position,
      })),
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/planning/courses");
  return { ok: true as const, count: items.length };
}

export type PlannerRecipeCandidate = {
  id: string;
  title: string;
  icon: string | null;
  /** The person's verdict, when they set cooking rules. */
  status: VerdictStatus | null;
};

/** Recipe search for the slot picker (RLS decides what is visible). */
export async function searchPlannerRecipes(
  q: string,
): Promise<PlannerRecipeCandidate[]> {
  const { supabase, user } = await requireUser();
  const query = q.trim();
  if (query.length < 2) return [];
  const { data } = await supabase
    .from("recipes")
    .select("id, title, icon")
    .eq("status", "published")
    .ilike("title", `%${query}%`)
    .limit(8);
  const rules = await loadFoodRules(supabase, user.id);
  const statuses = await verdictStatuses(
    supabase,
    rules,
    (data ?? []).map((r) => r.id),
  );
  return (data ?? []).map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    icon: recipe.icon,
    status: statuses.get(recipe.id) ?? null,
  }));
}

export async function toggleShoppingItem(itemId: string, checked: boolean) {
  const id = z.uuid().parse(itemId);
  const { supabase } = await requireUser();
  await supabase.from("shopping_items").update({ checked }).eq("id", id);
  return { ok: true as const };
}
