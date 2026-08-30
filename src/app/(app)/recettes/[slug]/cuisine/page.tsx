import { notFound, redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { CookClient, type CookIngredient, type CookStep } from "./cook-client";

export default async function CookModePage({
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
    .select("id, title, slug, icon")
    .eq("slug", slug)
    .maybeSingle();
  if (!recipe) notFound();

  const [{ data: steps }, { data: ingredients }] = await Promise.all([
    supabase
      .from("recipe_steps")
      .select("text, duration_sec, section")
      .eq("recipe_id", recipe.id)
      .order("position"),
    supabase
      .from("recipe_ingredients")
      .select("label_raw, qty, unit, grams")
      .eq("recipe_id", recipe.id)
      .order("position"),
  ]);
  if (!steps || steps.length === 0) redirect(`/recettes/${slug}`);

  const cookSteps: CookStep[] = steps.map((step) => ({
    text: step.text,
    durationSec: step.duration_sec,
    section: step.section,
  }));
  const cookIngredients: CookIngredient[] = (ingredients ?? []).map(
    (ingredient) => ({
      label: ingredient.label_raw,
      amount: ingredient.qty
        ? `${ingredient.qty} ${ingredient.unit ?? ""}`.trim()
        : ingredient.grams
          ? `${ingredient.grams} g`
          : "",
    }),
  );

  return (
    <CookClient
      slug={recipe.slug}
      title={recipe.title}
      icon={recipe.icon}
      steps={cookSteps}
      ingredients={cookIngredients}
    />
  );
}
