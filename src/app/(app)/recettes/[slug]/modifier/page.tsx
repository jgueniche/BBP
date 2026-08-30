import { notFound, redirect } from "next/navigation";

import {
  RecipeEditor,
  type EditorInitial,
} from "@/components/recipes/recipe-editor";
import { fr } from "@/i18n/fr";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!recipe) notFound();
  if (recipe.author_id !== user.id) redirect(`/recettes/${slug}`);

  const [{ data: ingredients }, { data: steps }] = await Promise.all([
    supabase
      .from("recipe_ingredients")
      .select("label_raw, grams, food_id")
      .eq("recipe_id", recipe.id)
      .order("position"),
    supabase
      .from("recipe_steps")
      .select("text")
      .eq("recipe_id", recipe.id)
      .order("position"),
  ]);

  const foodIds = (ingredients ?? [])
    .map((i) => i.food_id)
    .filter((id): id is string => id !== null);
  const foodNames = new Map<string, string>();
  if (foodIds.length > 0) {
    const { data: foods } = await supabase
      .from("foods")
      .select("id, name_fr")
      .in("id", foodIds);
    for (const food of foods ?? []) foodNames.set(food.id, food.name_fr);
  }

  const initial: EditorInitial = {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description ?? "",
    origin: (recipe.origin ?? "autre") as EditorInitial["origin"],
    category: (recipe.category ?? "plat") as EditorInitial["category"],
    difficulty: (recipe.difficulty ?? "facile") as EditorInitial["difficulty"],
    prepMin: `${recipe.prep_min ?? ""}`,
    cookMin: `${recipe.cook_min ?? ""}`,
    servings: `${recipe.servings}`,
    tags: recipe.tags.join(", "),
    visibility: recipe.visibility as EditorInitial["visibility"],
    versionKind: recipe.version_kind as EditorInitial["versionKind"],
    ingredients: (ingredients ?? []).map((ingredient) => ({
      label: ingredient.label_raw,
      grams: ingredient.grams === null ? "" : `${ingredient.grams}`,
      food_id: ingredient.food_id,
      foodName: ingredient.food_id
        ? (foodNames.get(ingredient.food_id) ?? null)
        : null,
    })),
    steps: (steps ?? []).map((step) => step.text),
  };

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        {fr.recettes.editorTitleEdit}
      </h1>
      <RecipeEditor initial={initial} />
    </section>
  );
}
