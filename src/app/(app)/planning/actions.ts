"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { Tables } from "@/db/types";
import type { KashrutClass } from "@/lib/kashrut/meal";
import {
  DEFAULT_AISLE,
  aisleForCategory,
  needsKosherNote,
} from "@/lib/planning/aisles";
import { pickReplacementSlot } from "@/lib/planning/fallback";
import {
  buildPlanningData,
  generateAndStoreWeek,
  getOrCreatePlan,
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

type SlotRow = Tables<"meal_plan_slots">;

function rowToSlot(row: SlotRow): PlanSlot {
  return {
    date: row.date,
    meal: row.meal as PlanMeal,
    recipeId: row.recipe_id,
    title: row.title,
    icon: row.icon,
    kashrutClass: (row.kashrut_class ?? null) as KashrutClass | null,
    isFish: row.is_fish,
    kcal: row.kcal,
    proteinG: row.protein_g,
    timeMin: row.time_min,
    hasHametz: row.has_hametz,
    hasKitniyot: row.has_kitniyot,
    tags: row.tags,
    isLeftover: row.is_leftover,
    locked: row.locked,
    servings: row.servings,
  };
}

function slotToInsert(slot: PlanSlot, planId: string) {
  return {
    plan_id: planId,
    date: slot.date,
    meal: slot.meal,
    recipe_id: slot.recipeId,
    title: slot.title,
    icon: slot.icon,
    kashrut_class: slot.kashrutClass,
    is_fish: slot.isFish,
    kcal: slot.kcal,
    protein_g: slot.proteinG,
    time_min: slot.timeMin,
    has_hametz: slot.hasHametz,
    has_kitniyot: slot.hasKitniyot,
    tags: slot.tags,
    is_leftover: slot.isLeftover,
    locked: slot.locked,
    servings: slot.servings,
  };
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
      "id, title, icon, kashrut_class, is_fish, prep_min, cook_min, tags, nutrition_per_serving",
    )
    .eq("id", recipeId)
    .maybeSingle();
  if (!recipe) return null;

  const { data: links } = await supabase
    .from("recipe_ingredients")
    .select("food_id")
    .eq("recipe_id", recipeId)
    .not("food_id", "is", null);
  const foodIds = (links ?? [])
    .map((l) => l.food_id)
    .filter((id): id is string => id !== null);
  const { data: foods } =
    foodIds.length > 0
      ? await supabase
          .from("foods")
          .select("hametz, kitniyot")
          .in("id", foodIds)
      : { data: [] };

  const nutrition = (recipe.nutrition_per_serving ?? {}) as {
    kcal?: number;
    protein_g?: number;
  };
  return {
    recipeId: recipe.id,
    title: recipe.title,
    icon: recipe.icon,
    kashrutClass: (recipe.kashrut_class ?? null) as KashrutClass | null,
    isFish: recipe.is_fish,
    kcal: typeof nutrition.kcal === "number" ? nutrition.kcal : null,
    proteinG:
      typeof nutrition.protein_g === "number" ? nutrition.protein_g : null,
    timeMin:
      recipe.prep_min === null && recipe.cook_min === null
        ? null
        : (recipe.prep_min ?? 0) + (recipe.cook_min ?? 0),
    hasHametz: (foods ?? []).some((f) => f.hametz),
    hasKitniyot: (foods ?? []).some((f) => f.kitniyot),
    tags: recipe.tags,
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

  const data = await buildPlanningData(supabase, user.id, weekStart);
  const before = validatePlan(slots, data.ctx);
  const after = validatePlan(
    [...slots.filter((s) => !(s.date === date && s.meal === meal)), candidate],
    data.ctx,
  );
  const blocking = newViolationMessages(before, after).filter(
    (message) => !message.includes("±10 %"),
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
    .insert(slotToInsert(candidate, plan.id));
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
        ...slotToInsert(replacement, row.plan_id),
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
  const { supabase, user } = await requireUser();

  const { data: row } = await supabase
    .from("meal_plan_slots")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false as const, violations: [] };
  if (row.date === toDate && row.meal === toMeal) {
    return { ok: true as const, violations: [] };
  }
  const { data: planRow } = await supabase
    .from("meal_plans")
    .select("week_start")
    .eq("id", row.plan_id)
    .maybeSingle();
  if (!planRow) return { ok: false as const, violations: [] };
  const weekStart = planRow.week_start;

  const { data: allRows } = await supabase
    .from("meal_plan_slots")
    .select("*")
    .eq("plan_id", row.plan_id);
  const target = (allRows ?? []).find(
    (r) => r.date === toDate && r.meal === toMeal,
  );

  const untouched = (allRows ?? [])
    .filter((r) => r.id !== id && r.id !== target?.id)
    .map(rowToSlot);
  const movedA: PlanSlot = { ...rowToSlot(row), date: toDate, meal: toMeal };
  const movedB: PlanSlot | null = target
    ? { ...rowToSlot(target), date: row.date, meal: row.meal as PlanMeal }
    : null;

  const data = await buildPlanningData(supabase, user.id, weekStart);
  const before = validatePlan((allRows ?? []).map(rowToSlot), data.ctx);
  const after = validatePlan(
    [...untouched, movedA, ...(movedB ? [movedB] : [])],
    data.ctx,
  );
  const blocking = newViolationMessages(before, after).filter(
    (message) => !message.includes("±10 %"),
  );
  if (blocking.length > 0) {
    return { ok: false as const, violations: blocking };
  }

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
    .insert(slotToInsert(movedA, row.plan_id));
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

/** One-tap: copy a planned day into the food journal. */
export async function addDayToJournal(rawDate: string) {
  const date = dateSchema.parse(rawDate);
  const weekStart = weekStartOf(date);
  const { supabase, user } = await requireUser();

  const { data: plan } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (!plan) return { ok: true as const, added: 0 };

  const [{ data: slots }, { data: existing }] = await Promise.all([
    supabase
      .from("meal_plan_slots")
      .select("*")
      .eq("plan_id", plan.id)
      .eq("date", date),
    supabase
      .from("food_logs")
      .select("meal")
      .eq("user_id", user.id)
      .eq("date", date)
      .eq("source", "recipe"),
  ]);
  const alreadyLogged = new Set((existing ?? []).map((log) => log.meal));

  let added = 0;
  for (const slot of slots ?? []) {
    if (alreadyLogged.has(slot.meal)) continue;
    const kcal = slot.kcal === null ? null : slot.kcal * slot.servings;
    const protein =
      slot.protein_g === null ? null : slot.protein_g * slot.servings;
    const { error } = await supabase.from("food_logs").insert({
      user_id: user.id,
      date,
      meal: slot.meal,
      items: [
        {
          food_id: null,
          name: slot.title,
          qty: slot.servings,
          unit: "portion",
          grams: 0,
          per_100g: {},
          kashrut_class: slot.kashrut_class,
          is_fish: slot.is_fish,
          kosher_hint: null,
          confidence: 1,
        },
      ],
      totals: {
        ...(kcal === null ? {} : { kcal: Math.round(kcal) }),
        ...(protein === null ? {} : { protein_g: Math.round(protein) }),
      },
      kashrut_class: slot.kashrut_class,
      source: "recipe",
      raw_input: "via planning",
    });
    if (!error) added += 1;
  }

  revalidatePath("/journal");
  return { ok: true as const, added };
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
          .select("id, name_fr, category, kashrut_class")
          .in("id", foodIds)
      : { data: [] };
  const foodById = new Map((foods ?? []).map((f) => [f.id, f]));

  type Aggregate = {
    label: string;
    grams: number | null;
    aisle: string;
    kosherNote: boolean;
  };
  const byKey = new Map<string, Aggregate>();
  for (const ingredient of ingredients ?? []) {
    const food = ingredient.food_id
      ? foodById.get(ingredient.food_id)
      : undefined;
    const label = food?.name_fr ?? ingredient.label_raw;
    const key = ingredient.food_id ?? label.toLowerCase();
    const kashrutClass = (food?.kashrut_class ?? null) as KashrutClass | null;
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
        kosherNote: needsKosherNote({ kashrutClass, label }),
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
        kosher_note: item.kosherNote,
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
  kashrutClass: KashrutClass | null;
  kcal: number | null;
};

/** Recipe search for the slot picker (RLS decides what is visible). */
export async function searchPlannerRecipes(
  q: string,
): Promise<PlannerRecipeCandidate[]> {
  const { supabase } = await requireUser();
  const query = q.trim();
  if (query.length < 2) return [];
  const { data } = await supabase
    .from("recipes")
    .select("id, title, icon, kashrut_class, nutrition_per_serving")
    .eq("status", "published")
    .ilike("title", `%${query}%`)
    .limit(8);
  return (data ?? []).map((recipe) => {
    const nutrition = (recipe.nutrition_per_serving ?? {}) as {
      kcal?: number;
    };
    return {
      id: recipe.id,
      title: recipe.title,
      icon: recipe.icon,
      kashrutClass: (recipe.kashrut_class ?? null) as KashrutClass | null,
      kcal: typeof nutrition.kcal === "number" ? nutrition.kcal : null,
    };
  });
}

export async function toggleShoppingItem(itemId: string, checked: boolean) {
  const id = z.uuid().parse(itemId);
  const { supabase } = await requireUser();
  await supabase.from("shopping_items").update({ checked }).eq("id", id);
  return { ok: true as const };
}
