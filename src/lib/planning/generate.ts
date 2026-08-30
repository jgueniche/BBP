import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { generateWeekPlanAi } from "@/ai/agents/meal-planner";
import type { Database } from "@/db/types";
import type { KashrutClass } from "@/lib/kashrut/meal";
import {
  weekJewishCalendar,
  type DayJewishInfo,
} from "@/lib/jewish-calendar/week";

import { buildFallbackPlan } from "./fallback";
import type { PlanContext, PlannerRecipe, PlanSlot } from "./types";
import { validatePlan } from "./validate";

type Supabase = SupabaseClient<Database>;

const POOL_LIMIT = 80;

export type PlanningData = {
  ctx: PlanContext;
  calendar: DayJewishInfo[];
  calendarText: string;
  pool: PlannerRecipe[];
  constraintsFromProfile: string | null;
};

function calendarSummary(days: DayJewishInfo[]): string {
  return days
    .map((day) => {
      const bits = [day.hebrewDate, ...day.labels];
      if (day.candleTime) bits.push(`allumage ${day.candleTime}`);
      if (day.isFast) bits.push("JEÛNE");
      if (day.isPessah) bits.push("PESSAH");
      return `${day.date} : ${bits.join(", ")}`;
    })
    .join("\n");
}

async function loadPool(
  supabase: Supabase,
  userId: string,
): Promise<PlannerRecipe[]> {
  const select =
    "id, title, icon, kashrut_class, is_fish, category, prep_min, cook_min, tags, nutrition_per_serving, author_id";
  const [{ data: community }, { data: mine }, { data: saves }] =
    await Promise.all([
      supabase
        .from("recipes")
        .select(select)
        .eq("status", "published")
        .eq("visibility", "community")
        .order("created_at")
        .limit(POOL_LIMIT),
      supabase.from("recipes").select(select).eq("author_id", userId),
      supabase.from("recipe_saves").select("recipe_id").eq("user_id", userId),
    ]);

  const savedIds = (saves ?? []).map((s) => s.recipe_id);
  const { data: saved } =
    savedIds.length > 0
      ? await supabase.from("recipes").select(select).in("id", savedIds)
      : { data: [] };

  const byId = new Map<string, NonNullable<typeof community>[number]>();
  for (const recipe of [
    ...(community ?? []),
    ...(mine ?? []),
    ...(saved ?? []),
  ]) {
    byId.set(recipe.id, recipe);
  }
  const rows = [...byId.values()].slice(0, POOL_LIMIT);

  // Hametz/kitniyot per recipe via its linked foods.
  const recipeIds = rows.map((r) => r.id);
  const flagged = new Map<string, { hametz: boolean; kitniyot: boolean }>();
  if (recipeIds.length > 0) {
    const { data: links } = await supabase
      .from("recipe_ingredients")
      .select("recipe_id, food_id")
      .in("recipe_id", recipeIds)
      .not("food_id", "is", null);
    const foodIds = [
      ...new Set(
        (links ?? [])
          .map((l) => l.food_id)
          .filter((id): id is string => id !== null),
      ),
    ];
    const { data: foods } =
      foodIds.length > 0
        ? await supabase
            .from("foods")
            .select("id, hametz, kitniyot")
            .in("id", foodIds)
        : { data: [] };
    const foodFlags = new Map(
      (foods ?? []).map((f) => [
        f.id,
        { hametz: f.hametz, kitniyot: f.kitniyot },
      ]),
    );
    for (const link of links ?? []) {
      if (!link.food_id) continue;
      const flags = foodFlags.get(link.food_id);
      if (!flags) continue;
      const current = flagged.get(link.recipe_id) ?? {
        hametz: false,
        kitniyot: false,
      };
      flagged.set(link.recipe_id, {
        hametz: current.hametz || flags.hametz,
        kitniyot: current.kitniyot || flags.kitniyot,
      });
    }
  }

  return rows.map((recipe) => {
    const nutrition = (recipe.nutrition_per_serving ?? {}) as {
      kcal?: number;
      protein_g?: number;
    };
    const flags = flagged.get(recipe.id) ?? { hametz: false, kitniyot: false };
    return {
      id: recipe.id,
      title: recipe.title,
      icon: recipe.icon,
      kashrutClass: (recipe.kashrut_class ?? null) as KashrutClass | null,
      isFish: recipe.is_fish,
      category: recipe.category,
      kcal: typeof nutrition.kcal === "number" ? nutrition.kcal : null,
      proteinG:
        typeof nutrition.protein_g === "number" ? nutrition.protein_g : null,
      timeMin:
        recipe.prep_min === null && recipe.cook_min === null
          ? null
          : (recipe.prep_min ?? 0) + (recipe.cook_min ?? 0),
      hasHametz: flags.hametz,
      hasKitniyot: flags.kitniyot,
      tags: recipe.tags,
    };
  });
}

export async function buildPlanningData(
  supabase: Supabase,
  userId: string,
  weekStart: string,
): Promise<PlanningData> {
  const [{ data: settings }, { data: goal }, { data: health }, pool] =
    await Promise.all([
      supabase
        .from("user_settings")
        .select(
          "shomer_shabbat, meat_to_dairy_wait_hours, dairy_to_meat_wait_hours, kitniyot, israel_calendar, mode, kashrut_enabled, jewish_calendar_enabled",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("goals")
        .select("calorie_target")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("health_profile")
        .select("allergies, dislikes")
        .eq("user_id", userId)
        .maybeSingle(),
      loadPool(supabase, userId),
    ]);

  const calendarEnabled = settings?.jewish_calendar_enabled ?? true;
  const calendar = weekJewishCalendar(weekStart, {
    il: settings?.israel_calendar ?? false,
  });
  // With the calendar disabled, chabbat/fast/Pessah rules vanish at the
  // source: empty date sets and no mandatory chabbat meals.
  const ctx: PlanContext = {
    weekStart,
    calorieTarget:
      settings?.mode === "boutargue" ? null : (goal?.calorie_target ?? null),
    kashrutEnabled: settings?.kashrut_enabled ?? true,
    shomerShabbat: calendarEnabled && (settings?.shomer_shabbat ?? true),
    meatToDairyWaitHours: settings?.meat_to_dairy_wait_hours ?? 6,
    dairyToMeatWaitHours: settings?.dairy_to_meat_wait_hours ?? 1,
    eatsKitniyot: settings?.kitniyot ?? true,
    pessahDates: calendarEnabled
      ? new Set(calendar.filter((d) => d.isPessah).map((d) => d.date))
      : new Set(),
    fastDates: calendarEnabled
      ? new Set(calendar.filter((d) => d.isFast).map((d) => d.date))
      : new Set(),
  };

  const profileBits: string[] = [];
  if (health?.allergies && health.allergies.length > 0) {
    profileBits.push(`Allergies (à exclure) : ${health.allergies.join(", ")}.`);
  }
  if (health?.dislikes && health.dislikes.length > 0) {
    profileBits.push(`N'aime pas : ${health.dislikes.join(", ")}.`);
  }

  return {
    ctx,
    calendar,
    calendarText: calendarEnabled
      ? calendarSummary(calendar)
      : "Aucune contrainte calendaire (calendrier juif désactivé par la personne).",
    pool,
    constraintsFromProfile:
      profileBits.length > 0 ? profileBits.join(" ") : null,
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
  const { data, lockedSlots } = params;
  const constraints =
    [params.constraints, data.constraintsFromProfile]
      .filter(Boolean)
      .join(" ") || null;

  let aiTried = false;
  let previousViolations: string[] | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const aiSlots = await generateWeekPlanAi({
      recipes: data.pool,
      ctx: data.ctx,
      calendarText: data.calendarText,
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

function slotToRow(slot: PlanSlot, planId: string) {
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

export type StoredGeneration =
  | {
      ok: true;
      source: "ai" | "fallback";
      aiFellBack: boolean;
      mealsPlanned: number;
    }
  | { ok: false; code: "quota" | "empty_pool" };

/** Full generate-validate-persist cycle, shared by the page action and Kémia. */
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
  const lockedSlots: PlanSlot[] = (lockedRows ?? []).map((row) => ({
    date: row.date,
    meal: row.meal as PlanSlot["meal"],
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
  }));

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
