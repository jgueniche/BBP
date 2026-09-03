"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { extractFoodItems } from "@/ai/agents/food-logger";
import type { Tables } from "@/db/types";
import { classifyMeal, type KashrutClass } from "@/lib/kashrut/meal";
import {
  computeTotals,
  foodLogItemSchema,
  type FoodLogItem,
} from "@/lib/nutrition/items";
import {
  dateSchema,
  logMealInputSchema,
  queuedMealSchema,
  type LogMealInput,
  type MealType as JournalMealType,
  type QueuedMeal,
} from "@/lib/nutrition/log-input";
import { parseFreeTextInput } from "@/lib/nutrition/parse-input";
import { createClient } from "@/lib/supabase/server";

// A type alias (erased) rather than `export type { X }`: Turbopack's Server
// Action transform keeps re-exports as values and the build fails.
export type MealType = JournalMealType;

export type FoodCandidate = {
  food_id: string;
  name: string;
  per_100g: Record<string, number>;
  kashrut_class: KashrutClass | null;
  is_fish: boolean;
  kosher_hint: string | null;
  category: string | null;
};

export type DraftItem = FoodLogItem & { candidates: FoodCandidate[] };

export type ParseResult = {
  items: DraftItem[];
  mealGuess: MealType | null;
  usedAi: boolean;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

function rowToCandidate(row: Tables<"foods">): FoodCandidate {
  return {
    food_id: row.id,
    name: row.name_fr,
    per_100g: (row.per_100g ?? {}) as Record<string, number>,
    kashrut_class: (row.kashrut_class ?? null) as KashrutClass | null,
    is_fish: row.is_fish,
    kosher_hint: row.kosher_hint,
    category: row.category,
  };
}

async function searchCandidates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  q: string,
  max: number,
): Promise<FoodCandidate[]> {
  const { data } = await supabase.rpc("search_foods", { q, max_results: max });
  return (data ?? []).map(rowToCandidate);
}

function toDraft(
  name: string,
  grams: number,
  qty: number,
  unit: FoodLogItem["unit"],
  confidence: number,
  candidates: FoodCandidate[],
): DraftItem {
  const best = candidates[0];
  return {
    food_id: best?.food_id ?? null,
    name: best?.name ?? name,
    qty,
    unit,
    grams,
    per_100g: best?.per_100g ?? {},
    kashrut_class: best?.kashrut_class ?? null,
    is_fish: best?.is_fish ?? false,
    kosher_hint: best?.kosher_hint ?? null,
    confidence: best ? confidence : Math.min(confidence, 0.3),
    candidates,
  };
}

export async function searchFoodsAction(q: string): Promise<FoodCandidate[]> {
  const { supabase } = await requireUser();
  if (q.trim().length < 2) return [];
  return searchCandidates(supabase, q.trim(), 8);
}

export async function parseFoodInput(input: {
  text?: string;
  imageBase64?: string;
  imageMediaType?: string;
}): Promise<ParseResult> {
  const { supabase } = await requireUser();

  const ai = await extractFoodItems(input);
  if (ai) {
    const items = await Promise.all(
      ai.items.map(async (item) => {
        const candidates = await searchCandidates(supabase, item.name, 5);
        return toDraft(
          item.name,
          item.grams,
          item.grams,
          "g",
          item.confidence,
          candidates,
        );
      }),
    );
    return { items, mealGuess: ai.meal_guess, usedAi: true };
  }

  if (!input.text) return { items: [], mealGuess: null, usedAi: false };

  const parts = parseFreeTextInput(input.text);
  const items = await Promise.all(
    parts.map(async (part) => {
      const candidates = await searchCandidates(supabase, part.query, 5);
      return toDraft(
        part.query,
        part.grams,
        part.qty,
        part.unit,
        0.7,
        candidates,
      );
    }),
  );
  return { items, mealGuess: null, usedAi: false };
}

export async function logMeal(input: LogMealInput) {
  const parsed = logMealInputSchema.parse(input);
  const { supabase, user } = await requireUser();

  const totals = computeTotals(parsed.items);
  const { kashrutClass, conflict } = classifyMeal(
    parsed.items.map((item) => item.kashrut_class),
  );
  const { data: settings } = await supabase
    .from("user_settings")
    .select("kashrut_enabled")
    .eq("user_id", user.id)
    .maybeSingle();
  const kashrutEnabled = settings?.kashrut_enabled ?? true;

  const { error } = await supabase.from("food_logs").insert({
    user_id: user.id,
    date: parsed.date,
    meal: parsed.meal,
    items: parsed.items,
    totals,
    kashrut_class: kashrutClass,
    source: parsed.source,
    raw_input: parsed.rawInput ?? null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/journal");
  return { ok: true as const, conflict: kashrutEnabled && conflict };
}

export async function deleteFoodLog(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("food_logs").delete().eq("id", z.uuid().parse(id));
  revalidatePath("/journal");
}

export async function repeatDay(fromDate: string, toDate: string) {
  const from = dateSchema.parse(fromDate);
  const to = dateSchema.parse(toDate);
  const { supabase, user } = await requireUser();

  const { data: logs } = await supabase
    .from("food_logs")
    .select("meal, items, totals, kashrut_class")
    .eq("user_id", user.id)
    .eq("date", from);

  if (!logs || logs.length === 0) return { copied: 0 };

  const { error } = await supabase.from("food_logs").insert(
    logs.map((log) => ({
      user_id: user.id,
      date: to,
      meal: log.meal,
      items: log.items,
      totals: log.totals,
      kashrut_class: log.kashrut_class,
      source: "repeat" as const,
    })),
  );
  if (error) throw new Error(error.message);

  revalidatePath("/journal");
  return { copied: logs.length };
}

export async function saveFavorite(label: string, items: FoodLogItem[]) {
  const cleanLabel = z.string().min(1).max(60).parse(label.trim());
  const cleanItems = z.array(foodLogItemSchema).min(1).parse(items);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("food_favorites")
    .upsert({ user_id: user.id, label: cleanLabel, items: cleanItems });
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function logFavorite(label: string, date: string, meal: MealType) {
  const { supabase, user } = await requireUser();
  const { data: favorite } = await supabase
    .from("food_favorites")
    .select("items")
    .eq("user_id", user.id)
    .eq("label", label)
    .maybeSingle();
  if (!favorite) throw new Error("Favorite not found");

  const items = z.array(foodLogItemSchema).parse(favorite.items);
  return logMeal({ date, meal, items, source: "manual", rawInput: label });
}

/**
 * Replays a meal captured offline (brief §10.14). Foods were not resolvable
 * without network, so each item is matched again against the base by name
 * with the grams the user confirmed, then logged like any other meal.
 */
export async function syncQueuedMeal(raw: QueuedMeal) {
  const queued = queuedMealSchema.parse(raw);
  if (queued.kind === "favorite") {
    return logFavorite(queued.label, queued.date, queued.meal);
  }
  const { supabase } = await requireUser();
  const items = await Promise.all(
    queued.items.map(async (item) => {
      const candidates = await searchCandidates(supabase, item.name, 5);
      const { candidates: found, ...draft } = toDraft(
        item.name,
        item.grams,
        item.grams,
        "g",
        0.7,
        candidates,
      );
      void found;
      return draft;
    }),
  );
  return logMeal({
    date: queued.date,
    meal: queued.meal,
    items,
    source: queued.source,
    rawInput: queued.rawInput,
  });
}

const OFF_FIELDS =
  "product_name,product_name_fr,brands,nutriments,quantity,serving_size";

export async function lookupBarcode(code: string): Promise<DraftItem | null> {
  await requireUser();
  const barcode = z
    .string()
    .regex(/^\d{6,14}$/)
    .parse(code);

  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=${OFF_FIELDS}`,
    {
      headers: {
        "User-Agent": process.env.OPENFOODFACTS_USER_AGENT ?? "BBP/0.1 (dev)",
      },
      // Brief §6: 30-day cache for OpenFoodFacts lookups.
      next: { revalidate: 2_592_000 },
    },
  );
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    status: number;
    product?: {
      product_name?: string;
      product_name_fr?: string;
      brands?: string;
      nutriments?: Record<string, number>;
    };
  };
  if (payload.status !== 1 || !payload.product) return null;

  const { product } = payload;
  const n = product.nutriments ?? {};
  const per_100g: Record<string, number> = {};
  const mapping: Array<[string, string, number]> = [
    ["kcal", "energy-kcal_100g", 1],
    ["protein_g", "proteins_100g", 1],
    ["carb_g", "carbohydrates_100g", 1],
    ["fat_g", "fat_100g", 1],
    ["sugars_g", "sugars_100g", 1],
    ["fiber_g", "fiber_100g", 1],
    ["satfat_g", "saturated-fat_100g", 1],
    ["sodium_mg", "sodium_100g", 1000],
  ];
  for (const [key, offKey, factor] of mapping) {
    const value = n[offKey];
    if (typeof value === "number") {
      per_100g[key] = Math.round(value * factor * 100) / 100;
    }
  }

  const name =
    product.product_name_fr || product.product_name || `Produit ${barcode}`;

  return {
    food_id: null,
    name: product.brands ? `${name} (${product.brands})` : name,
    qty: 100,
    unit: "g",
    grams: 100,
    per_100g,
    kashrut_class: null,
    is_fish: false,
    kosher_hint: "produit scanné : indication non certifiée",
    confidence: 0.9,
    candidates: [],
  };
}
