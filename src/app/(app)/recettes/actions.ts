"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { checkKashrut } from "@/ai/agents/kashrut-checker";
import { generateProteinVersion as generateProteinVersionAi } from "@/ai/agents/protein-version";
import type { Tables } from "@/db/types";
import {
  classifyRecipe,
  type IngredientForClassification,
} from "@/lib/kashrut/classify";
import type { KashrutClass } from "@/lib/kashrut/meal";
import { computeRecipeNutrition } from "@/lib/nutrition/recipe";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/slug";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export type RecipeFoodCandidate = {
  food_id: string;
  name: string;
  per_100g: Record<string, number>;
  kashrut_class: KashrutClass | null;
  is_fish: boolean;
  kosher_hint: string | null;
};

export async function searchFoodsForRecipe(
  q: string,
): Promise<RecipeFoodCandidate[]> {
  const { supabase } = await requireUser();
  if (q.trim().length < 2) return [];
  const { data } = await supabase.rpc("search_foods", {
    q: q.trim(),
    max_results: 6,
  });
  return (data ?? []).map((row) => ({
    food_id: row.id,
    name: row.name_fr,
    per_100g: (row.per_100g ?? {}) as Record<string, number>,
    kashrut_class: (row.kashrut_class ?? null) as KashrutClass | null,
    is_fish: row.is_fish,
    kosher_hint: row.kosher_hint,
  }));
}

const ingredientSchema = z.object({
  label: z.string().min(1).max(120),
  qty: z.number().positive().max(20000).nullable(),
  unit: z.string().max(20).nullable(),
  grams: z.number().positive().max(20000).nullable(),
  food_id: z.uuid().nullable(),
});

const recipeSchema = z.object({
  id: z.uuid().nullable(),
  title: z.string().min(3).max(120),
  description: z.string().max(500).nullable(),
  origin: z
    .enum(["tunisie", "algerie", "maroc", "israel", "ashkenaze", "autre"])
    .nullable(),
  category: z
    .enum(["kemia", "entree", "plat", "dessert", "pain", "boisson"])
    .nullable(),
  difficulty: z.enum(["facile", "moyen", "difficile"]).nullable(),
  prepMin: z.number().int().min(0).max(600).nullable(),
  cookMin: z.number().int().min(0).max(1440).nullable(),
  servings: z.number().int().min(1).max(24),
  tags: z.array(z.string().max(30)).max(10),
  visibility: z.enum(["private", "famille", "community"]),
  versionKind: z.enum(["boutargue", "proteine"]),
  ingredients: z.array(ingredientSchema).min(1).max(30),
  steps: z.array(z.string().min(3).max(600)).min(1).max(15),
});

export type RecipeInput = z.infer<typeof recipeSchema>;

async function classifyAndNutrition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ingredients: RecipeInput["ingredients"],
  servings: number,
) {
  const foodIds = ingredients
    .map((i) => i.food_id)
    .filter((id): id is string => id !== null);
  const foodById = new Map<string, Tables<"foods">>();
  if (foodIds.length > 0) {
    const { data: foods } = await supabase
      .from("foods")
      .select("*")
      .in("id", foodIds);
    for (const food of foods ?? []) foodById.set(food.id, food);
  }

  const forClassification: IngredientForClassification[] = ingredients.map(
    (ingredient) => {
      const food = ingredient.food_id
        ? foodById.get(ingredient.food_id)
        : undefined;
      return {
        label: ingredient.label,
        foodClass: (food?.kashrut_class ?? null) as KashrutClass | null,
        foodIsFish: food?.is_fish ?? false,
        foodHint: food?.kosher_hint ?? null,
      };
    },
  );

  let classification = classifyRecipe(forClassification);
  if (classification.confidence < 0.8) {
    const checked = await checkKashrut(ingredients.map((i) => i.label));
    if (checked) {
      classification = {
        ...checked,
        flags: [...new Set([...classification.flags, ...checked.flags])],
      };
    }
  }

  const nutrition = computeRecipeNutrition(
    ingredients.map((ingredient) => ({
      grams: ingredient.grams,
      per_100g: ingredient.food_id
        ? ((foodById.get(ingredient.food_id)?.per_100g ?? {}) as Record<
            string,
            number
          >)
        : {},
    })),
    servings,
  );

  return { classification, nutrition };
}

async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
  currentId: string | null,
): Promise<string> {
  const base = slugify(title) || "recette";
  for (let i = 0; i < 20; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const { data } = await supabase
      .from("recipes")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data || data.id === currentId) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function saveRecipe(raw: RecipeInput) {
  const input = recipeSchema.parse(raw);
  const { supabase, user } = await requireUser();

  const { classification, nutrition } = await classifyAndNutrition(
    supabase,
    input.ingredients,
    input.servings,
  );

  let recipeId = input.id;
  let slug: string;

  if (recipeId) {
    const { data: existing } = await supabase
      .from("recipes")
      .select("slug, author_id")
      .eq("id", recipeId)
      .maybeSingle();
    if (!existing || existing.author_id !== user.id) {
      throw new Error("Not your recipe");
    }
    slug = existing.slug;
    const { error } = await supabase
      .from("recipes")
      .update({
        title: input.title,
        description: input.description,
        origin: input.origin,
        category: input.category,
        difficulty: input.difficulty,
        prep_min: input.prepMin,
        cook_min: input.cookMin,
        servings: input.servings,
        tags: input.tags,
        visibility: input.visibility,
        version_kind: input.versionKind,
        kashrut_class: classification.kashrutClass,
        is_fish: classification.isFish,
        kashrut_confidence: classification.confidence,
        kosher_flags: classification.flags,
        nutrition_per_serving: nutrition,
      })
      .eq("id", recipeId);
    if (error) throw new Error(error.message);
    await supabase
      .from("recipe_ingredients")
      .delete()
      .eq("recipe_id", recipeId);
    await supabase.from("recipe_steps").delete().eq("recipe_id", recipeId);
  } else {
    slug = await uniqueSlug(supabase, input.title, null);
    const { data: created, error } = await supabase
      .from("recipes")
      .insert({
        author_id: user.id,
        title: input.title,
        slug,
        description: input.description,
        origin: input.origin,
        category: input.category,
        difficulty: input.difficulty,
        prep_min: input.prepMin,
        cook_min: input.cookMin,
        servings: input.servings,
        tags: input.tags,
        visibility: input.visibility,
        version_kind: input.versionKind,
        kashrut_class: classification.kashrutClass,
        is_fish: classification.isFish,
        kashrut_confidence: classification.confidence,
        kosher_flags: classification.flags,
        nutrition_per_serving: nutrition,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    recipeId = created.id;
  }

  const { error: ingError } = await supabase.from("recipe_ingredients").insert(
    input.ingredients.map((ingredient, position) => ({
      recipe_id: recipeId!,
      position,
      food_id: ingredient.food_id,
      qty: ingredient.qty,
      unit: ingredient.unit,
      grams: ingredient.grams,
      label_raw: ingredient.label,
    })),
  );
  if (ingError) throw new Error(ingError.message);

  const { error: stepError } = await supabase.from("recipe_steps").insert(
    input.steps.map((text, position) => ({
      recipe_id: recipeId!,
      position,
      text,
    })),
  );
  if (stepError) throw new Error(stepError.message);

  revalidatePath("/recettes");
  revalidatePath(`/recettes/${slug}`);
  return { ok: true as const, slug };
}

export async function deleteRecipe(id: string) {
  const recipeId = z.uuid().parse(id);
  const { supabase } = await requireUser();
  await supabase.from("recipes").delete().eq("id", recipeId);
  revalidatePath("/recettes");
  return { ok: true as const };
}

export async function forkRecipe(id: string) {
  const recipeId = z.uuid().parse(id);
  const { supabase, user } = await requireUser();

  const [{ data: source }, { data: ingredients }, { data: steps }] =
    await Promise.all([
      supabase.from("recipes").select("*").eq("id", recipeId).maybeSingle(),
      supabase
        .from("recipe_ingredients")
        .select("*")
        .eq("recipe_id", recipeId)
        .order("position"),
      supabase
        .from("recipe_steps")
        .select("*")
        .eq("recipe_id", recipeId)
        .order("position"),
    ]);
  if (!source) throw new Error("Recipe not found");

  const title = `Ma version — ${source.title}`;
  const slug = await uniqueSlug(supabase, title, null);
  const { data: created, error } = await supabase
    .from("recipes")
    .insert({
      author_id: user.id,
      title,
      slug,
      description: source.description,
      origin: source.origin,
      category: source.category,
      difficulty: source.difficulty,
      prep_min: source.prep_min,
      cook_min: source.cook_min,
      servings: source.servings,
      tags: source.tags,
      visibility: "private",
      version_kind: source.version_kind,
      parent_recipe_id: source.id,
      kashrut_class: source.kashrut_class,
      is_fish: source.is_fish,
      kashrut_confidence: source.kashrut_confidence,
      kosher_flags: source.kosher_flags,
      nutrition_per_serving: source.nutrition_per_serving,
      source_author: source.source_author,
      source_url: source.source_url,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (ingredients && ingredients.length > 0) {
    await supabase.from("recipe_ingredients").insert(
      ingredients.map((ingredient) => ({
        recipe_id: created.id,
        position: ingredient.position,
        food_id: ingredient.food_id,
        qty: ingredient.qty,
        unit: ingredient.unit,
        grams: ingredient.grams,
        label_raw: ingredient.label_raw,
      })),
    );
  }
  if (steps && steps.length > 0) {
    await supabase.from("recipe_steps").insert(
      steps.map((step) => ({
        recipe_id: created.id,
        position: step.position,
        text: step.text,
      })),
    );
  }

  revalidatePath("/recettes");
  return { ok: true as const, slug };
}

export async function createProteinVersion(id: string) {
  const recipeId = z.uuid().parse(id);
  const { supabase, user } = await requireUser();

  const [{ data: source }, { data: ingredients }, { data: steps }] =
    await Promise.all([
      supabase.from("recipes").select("*").eq("id", recipeId).maybeSingle(),
      supabase
        .from("recipe_ingredients")
        .select("label_raw, grams")
        .eq("recipe_id", recipeId)
        .order("position"),
      supabase
        .from("recipe_steps")
        .select("text")
        .eq("recipe_id", recipeId)
        .order("position"),
    ]);
  if (!source) throw new Error("Recipe not found");

  const generated = await generateProteinVersionAi({
    title: source.title,
    servings: source.servings,
    ingredients: (ingredients ?? []).map((i) => ({
      label: i.label_raw,
      grams: i.grams,
    })),
    steps: (steps ?? []).map((s) => s.text),
  });
  if (!generated) return { ok: false as const, code: "ai_off" as const };

  const linked = await Promise.all(
    generated.ingredients.map(async (ingredient) => {
      const { data: candidates } = await supabase.rpc("search_foods", {
        q: ingredient.label,
        max_results: 1,
      });
      const best = candidates?.[0];
      return {
        label: ingredient.label,
        qty: ingredient.grams,
        unit: "g",
        grams: ingredient.grams,
        food_id: best?.id ?? null,
      };
    }),
  );

  const { classification, nutrition } = await classifyAndNutrition(
    supabase,
    linked,
    source.servings,
  );

  const slug = await uniqueSlug(supabase, generated.title, null);
  const { data: created, error } = await supabase
    .from("recipes")
    .insert({
      author_id: user.id,
      title: generated.title,
      slug,
      description: generated.description,
      origin: source.origin,
      category: source.category,
      difficulty: source.difficulty,
      prep_min: source.prep_min,
      cook_min: source.cook_min,
      servings: source.servings,
      tags: source.tags,
      visibility: "private",
      version_kind: "proteine",
      parent_recipe_id: source.id,
      kashrut_class: classification.kashrutClass,
      is_fish: classification.isFish,
      kashrut_confidence: classification.confidence,
      kosher_flags: classification.flags,
      nutrition_per_serving: nutrition,
      substitutions: generated.substitutions,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("recipe_ingredients").insert(
    linked.map((ingredient, position) => ({
      recipe_id: created.id,
      position,
      food_id: ingredient.food_id,
      qty: ingredient.qty,
      unit: ingredient.unit,
      grams: ingredient.grams,
      label_raw: ingredient.label,
    })),
  );
  await supabase.from("recipe_steps").insert(
    generated.steps.map((text, position) => ({
      recipe_id: created.id,
      position,
      text,
    })),
  );

  revalidatePath("/recettes");
  return { ok: true as const, slug };
}
