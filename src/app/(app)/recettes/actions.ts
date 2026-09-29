"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { generateProteinVersion as generateProteinVersionAi } from "@/ai/agents/protein-version";
import { creatorFromSource, creatorLabel } from "@/lib/creators/identity";
import { checkImport, resolveCreatorId } from "@/lib/creators/server";
import { computeRecipeNutrition } from "@/lib/nutrition/recipe";
import { ALL_CUISINES, CATEGORIES } from "@/lib/recipes/cuisines";
import { isReservedRecipeSlug } from "@/lib/recipes/slugs";
import { resolveRecipeTags } from "@/lib/recipes/tags";
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
  }));
}

const ingredientSchema = z.object({
  label: z.string().min(1).max(120),
  qty: z.number().positive().max(20000).nullable(),
  unit: z.string().max(20).nullable(),
  grams: z.number().positive().max(20000).nullable(),
  food_id: z.uuid().nullable(),
  section: z.string().max(60).nullable(),
});

const stepSchema = z.object({
  text: z.string().min(3).max(600),
  durationMin: z.number().int().min(1).max(720).nullable(),
  section: z.string().max(60).nullable(),
});

const recipeSchema = z.object({
  id: z.uuid().nullable(),
  title: z.string().min(3).max(120),
  description: z.string().max(500).nullable(),
  origin: z.enum(ALL_CUISINES).nullable(),
  category: z.enum(CATEGORIES).nullable(),
  difficulty: z.enum(["facile", "moyen", "difficile"]).nullable(),
  prepMin: z.number().int().min(0).max(600).nullable(),
  cookMin: z.number().int().min(0).max(1440).nullable(),
  servings: z.number().int().min(1).max(24),
  tags: z.array(z.string().max(40)).max(10),
  visibility: z.enum(["private", "famille", "community"]),
  versionKind: z.enum(["boutargue", "proteine"]),
  icon: z.string().max(8).nullable(),
  sourceUrl: z.url().max(500).nullable(),
  sourceAuthor: z.string().max(120).nullable(),
  ingredients: z.array(ingredientSchema).min(1).max(30),
  steps: z.array(stepSchema).min(1).max(25),
});

export type RecipeInput = z.infer<typeof recipeSchema>;

async function recipeNutrition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ingredients: RecipeInput["ingredients"],
  servings: number,
) {
  const foodIds = ingredients
    .map((i) => i.food_id)
    .filter((id): id is string => id !== null);
  const perFood = new Map<string, Record<string, number>>();
  if (foodIds.length > 0) {
    const { data: foods } = await supabase
      .from("foods")
      .select("id, per_100g")
      .in("id", foodIds);
    for (const food of foods ?? []) {
      perFood.set(food.id, (food.per_100g ?? {}) as Record<string, number>);
    }
  }
  // Diet verdicts are computed from the ingredients when read (ADR-032).
  return computeRecipeNutrition(
    ingredients.map((ingredient) => ({
      grams: ingredient.grams,
      per_100g: ingredient.food_id
        ? (perFood.get(ingredient.food_id) ?? {})
        : {},
    })),
    servings,
  );
}

async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
  currentId: string | null,
): Promise<string> {
  const base = slugify(title) || "recette";
  // A reserved slug would be hidden behind a page of /recettes.
  for (let i = isReservedRecipeSlug(base) ? 1 : 0; i < 20; i += 1) {
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

export type SaveRecipeResult =
  | { ok: true; slug: string; queued: boolean }
  | {
      /** The creator withdrew the post or refuses imports. */
      ok: false;
      code: "withdrawn" | "blocked";
      creator: string | null;
    };

export async function saveRecipe(raw: RecipeInput): Promise<SaveRecipeResult> {
  const input = recipeSchema.parse(raw);
  const { supabase, user } = await requireUser();

  // A new import is tied to its creator, unless she said no (ADR-035).
  let creatorId: string | null = null;
  if (!input.id && input.sourceUrl) {
    const identity = creatorFromSource({
      sourceUrl: input.sourceUrl,
      sourceAuthor: input.sourceAuthor,
    });
    const check = await checkImport(supabase, input.sourceUrl, identity);
    if (check.withdrawn || check.blocked) {
      return {
        ok: false,
        code: check.withdrawn ? "withdrawn" : "blocked",
        creator: identity
          ? creatorLabel(identity.platform, identity.handle)
          : null,
      };
    }
    if (identity) {
      // A channel or account name, never a site's (a site has many authors).
      const displayName =
        identity.platform !== "web" &&
        input.sourceAuthor &&
        !input.sourceAuthor.startsWith("@")
          ? input.sourceAuthor
          : null;
      creatorId = await resolveCreatorId(supabase, identity, displayName);
    }
  }

  const nutrition = await recipeNutrition(
    supabase,
    input.ingredients,
    input.servings,
  );
  const tags = await resolveRecipeTags(supabase, user.id, input.tags);

  let recipeId = input.id;
  let slug: string;
  let queued = false;

  if (recipeId) {
    const { data: existing } = await supabase
      .from("recipes")
      .select("slug, author_id, source_url, source_author, withdrawn_at")
      .eq("id", recipeId)
      .maybeSingle();
    if (!existing || existing.author_id !== user.id) {
      throw new Error("Not your recipe");
    }
    slug = existing.slug;
    // The credit of an import is not edited, and a withdrawn copy stays
    // private in its owner's book.
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
        tags,
        visibility: existing.withdrawn_at ? "private" : input.visibility,
        version_kind: input.versionKind,
        icon: input.icon,
        source_url: existing.source_url,
        source_author: existing.source_url
          ? existing.source_author
          : input.sourceAuthor,
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
        tags,
        visibility: input.visibility,
        version_kind: input.versionKind,
        icon: input.icon,
        source_url: input.sourceUrl,
        source_author: input.sourceAuthor,
        creator_id: creatorId,
        nutrition_per_serving: nutrition,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    recipeId = created.id;
    // An import lands in « À cuisiner » until it is cooked.
    if (input.sourceUrl) {
      const { error: queueError } = await supabase
        .from("to_cook")
        .insert({ user_id: user.id, recipe_id: created.id, source: "import" });
      queued = !queueError;
    }
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
      section: ingredient.section,
    })),
  );
  if (ingError) throw new Error(ingError.message);

  const { error: stepError } = await supabase.from("recipe_steps").insert(
    input.steps.map((step, position) => ({
      recipe_id: recipeId!,
      position,
      text: step.text,
      duration_sec: step.durationMin === null ? null : step.durationMin * 60,
      section: step.section,
    })),
  );
  if (stepError) throw new Error(stepError.message);

  revalidatePath("/recettes");
  revalidatePath(`/recettes/${slug}`);
  return { ok: true as const, slug, queued };
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
  // A version of a withdrawn post stays private and marked too.
  const withdrawn =
    source.withdrawn_at !== null ||
    (source.source_url !== null &&
      (await checkImport(supabase, source.source_url, null)).withdrawn);

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
      icon: source.icon,
      nutrition_per_serving: source.nutrition_per_serving,
      source_author: source.source_author,
      source_url: source.source_url,
      creator_id: source.creator_id,
      withdrawn_at: withdrawn ? new Date().toISOString() : null,
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
        section: ingredient.section,
      })),
    );
  }
  if (steps && steps.length > 0) {
    await supabase.from("recipe_steps").insert(
      steps.map((step) => ({
        recipe_id: created.id,
        position: step.position,
        text: step.text,
        duration_sec: step.duration_sec,
        section: step.section,
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
        section: null,
      };
    }),
  );

  const nutrition = await recipeNutrition(supabase, linked, source.servings);

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
      icon: source.icon,
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
      section: ingredient.section,
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

export type TagSuggestion = { slug: string; label: string };

/** Reference tags only (never synonyms), for the editor suggestions. */
export async function searchTags(q: string): Promise<TagSuggestion[]> {
  const { supabase } = await requireUser();
  const term = q.replace(/^#/, "").trim();
  if (term.length < 2) return [];
  const { data } = await supabase
    .from("tags")
    .select("slug, label")
    .is("canonical_id", null)
    .or(
      `label.ilike.%${term.replace(/[%,()]/g, "")}%,slug.ilike.%${term.replace(/[%,()]/g, "")}%`,
    )
    .order("label")
    .limit(8);
  return data ?? [];
}
