import { Clock, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { KashrutPill } from "@/components/ui/kashrut-pill";
import { fr } from "@/i18n/fr";
import type { KashrutClass } from "@/lib/kashrut/meal";
import type { Totals } from "@/lib/nutrition/items";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { RecipeActions } from "./recipe-actions";

const t = fr.recettes;

export default async function RecipePage({
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

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!recipe) notFound();

  const [
    { data: ingredients },
    { data: steps },
    { data: versions },
    parentRes,
  ] = await Promise.all([
    supabase
      .from("recipe_ingredients")
      .select("id, label_raw, qty, unit, grams, food_id")
      .eq("recipe_id", recipe.id)
      .order("position"),
    supabase
      .from("recipe_steps")
      .select("id, text")
      .eq("recipe_id", recipe.id)
      .order("position"),
    supabase
      .from("recipes")
      .select("slug, title, version_kind")
      .eq("parent_recipe_id", recipe.id),
    recipe.parent_recipe_id
      ? supabase
          .from("recipes")
          .select("slug, title, version_kind")
          .eq("id", recipe.parent_recipe_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const parent = parentRes.data;
  const nutrition = (recipe.nutrition_per_serving ?? {}) as Totals;
  const substitutions = (recipe.substitutions ?? null) as Array<{
    original: string;
    replacement: string;
    reason: string;
  }> | null;
  const isOwner = user !== null && recipe.author_id === user.id;
  const hasProteinVersion = (versions ?? []).some(
    (v) => v.version_kind === "proteine",
  );

  return (
    <article className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {recipe.title}
        </h1>
        {recipe.description && (
          <p className="text-sm text-ink-70">{recipe.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {recipe.kashrut_class && (
            <KashrutPill
              kind={recipe.kashrut_class as KashrutClass}
              isFish={recipe.is_fish}
            />
          )}
          <Badge
            variant={recipe.version_kind === "proteine" ? "primary" : "default"}
          >
            {t.versions[recipe.version_kind as keyof typeof t.versions]}
          </Badge>
          {recipe.origin && (
            <span className="text-xs text-ink-50">
              {t.origins[recipe.origin as keyof typeof t.origins]}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-ink-50">
            <Clock size={13} strokeWidth={2} aria-hidden />
            {(recipe.prep_min ?? 0) + (recipe.cook_min ?? 0)} {t.minutes}
          </span>
          <span className="flex items-center gap-1 text-xs text-ink-50">
            <Users size={13} strokeWidth={2} aria-hidden />
            {recipe.servings} {t.servings}
          </span>
        </div>
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-ink-10 px-2 py-0.5 text-[11px] font-medium text-ink-70"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {(parent || (versions ?? []).length > 0) && (
        <p className="flex flex-wrap gap-2 text-sm">
          {parent && (
            <Link
              href={`/recettes/${parent.slug}`}
              className="font-medium underline underline-offset-4"
            >
              {recipe.version_kind === "proteine"
                ? `${t.proteinOf} « ${parent.title} »`
                : `${t.versionOf} « ${parent.title} »`}
            </Link>
          )}
          {(versions ?? []).map((v) => (
            <Link
              key={v.slug}
              href={`/recettes/${v.slug}`}
              className="font-medium text-boutargue-deep underline underline-offset-4"
            >
              {v.version_kind === "proteine"
                ? t.versions.proteine
                : t.versions.boutargue}{" "}
              → {v.title}
            </Link>
          ))}
        </p>
      )}

      {user && (
        <RecipeActions
          recipeId={recipe.id}
          slug={recipe.slug}
          isOwner={isOwner}
          canGenerateProtein={
            recipe.version_kind === "boutargue" && !hasProteinVersion
          }
        />
      )}

      {substitutions && substitutions.length > 0 && (
        <section className="rounded-[20px] border-2 border-ink bg-boutargue-soft p-4">
          <h2 className="font-display text-base font-extrabold text-[#0b0b0b]">
            {t.substitutionsTitle}
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-[#3d3d3d]">
            {substitutions.map((s, i) => (
              <li key={i}>
                <span className="font-semibold">{s.original}</span> →{" "}
                <span className="font-semibold">{s.replacement}</span> :{" "}
                {s.reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-display text-lg font-extrabold">{t.ingredients}</h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm">
          {(ingredients ?? []).map((ingredient) => (
            <li
              key={ingredient.id}
              className="flex justify-between gap-2 border-b border-ink-10 pb-1.5"
            >
              <span>{ingredient.label_raw}</span>
              <span className="shrink-0 font-mono text-xs text-ink-50">
                {ingredient.qty
                  ? `${ingredient.qty} ${ingredient.unit ?? ""}`
                  : ingredient.grams
                    ? `${ingredient.grams} g`
                    : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg font-extrabold">{t.steps}</h2>
        <ol className="mt-2 flex list-none flex-col gap-3">
          {(steps ?? []).map((step, index) => (
            <li key={step.id} className="flex gap-3 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-ink font-mono text-xs font-bold">
                {index + 1}
              </span>
              <span>{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      {typeof nutrition.kcal === "number" && (
        <section>
          <h2 className="font-display text-lg font-extrabold">{t.nutrition}</h2>
          <p className="mt-1 text-xs text-ink-50">{t.perServing}</p>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            {(
              [
                ["kcal", nutrition.kcal, ""],
                ["P", nutrition.protein_g, "g"],
                ["G", nutrition.carb_g, "g"],
                ["L", nutrition.fat_g, "g"],
              ] as const
            ).map(([label, value, unit]) => (
              <div
                key={label}
                className="rounded-[14px] border-2 border-ink-10 p-2"
              >
                <p className="font-mono text-sm font-semibold">
                  {typeof value === "number" ? Math.round(value) : "—"}
                  {unit}
                </p>
                <p className="text-[10px] text-ink-50">{label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {recipe.kosher_flags.length > 0 && (
        <section className="rounded-[16px] border-2 border-warn/40 bg-paper p-3">
          <h2 className="text-sm font-bold text-warn">{t.flagsTitle}</h2>
          <ul className="mt-1 text-xs text-ink-70">
            {recipe.kosher_flags.map((flag, i) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[11px] text-ink-50">{t.kosherDisclaimer}</p>
    </article>
  );
}
