import type { Metadata } from "next";
import Link from "next/link";

import { KashrutPill } from "@/components/ui/kashrut-pill";
import { fr } from "@/i18n/fr";
import type { KashrutClass } from "@/lib/kashrut/meal";
import { createAnonClient } from "@/lib/supabase/anon";

async function loadRecipe(slug: string) {
  const supabase = createAnonClient();
  const { data } = await supabase
    .from("recipes")
    .select(
      "title, description, icon, slug, kashrut_class, is_fish, origin, prep_min, cook_min, servings, source_author",
    )
    .eq("slug", slug)
    .eq("visibility", "community")
    .eq("status", "published")
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await loadRecipe(slug);
  const title = recipe
    ? `${recipe.title} — BBP`
    : "BBP — Boukha, Boutargue & Protéines";
  const description = recipe?.description ?? fr.app.tagline;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`/api/og/recette/${slug}`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og/recette/${slug}`],
    },
  };
}

export default async function PublicRecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const recipe = await loadRecipe(slug);

  if (!recipe) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="font-display text-2xl font-extrabold">
          {fr.app.fullName}
        </h1>
        <p className="mt-3 text-sm text-ink-70">{fr.recettes.empty}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10">
      <div className="rounded-lg border bg-card p-6 shadow-soft">
        {recipe.icon && (
          <p className="text-5xl leading-none" aria-hidden>
            {recipe.icon}
          </p>
        )}
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
          {recipe.title}
        </h1>
        {recipe.description && (
          <p className="mt-2 text-sm text-ink-70">{recipe.description}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-50">
          {recipe.kashrut_class && (
            <KashrutPill
              kind={recipe.kashrut_class as KashrutClass}
              isFish={recipe.is_fish}
            />
          )}
          <span>
            {(recipe.prep_min ?? 0) + (recipe.cook_min ?? 0)}{" "}
            {fr.recettes.minutes}
          </span>
          <span>
            {recipe.servings} {fr.recettes.servings}
          </span>
        </div>
        {recipe.source_author && (
          <p className="mt-2 text-xs text-ink-50">
            {fr.recettes.importedFrom} {recipe.source_author}
          </p>
        )}
      </div>
      <Link
        href={`/recettes/${recipe.slug}`}
        className="rounded-full border bg-boutargue px-5 py-2.5 text-center font-display text-sm font-extrabold text-paper shadow-soft"
      >
        {fr.recettes.openInApp}
      </Link>
      <p className="text-center text-xs text-ink-50">
        {fr.app.fullName} · {fr.app.tagline}
      </p>
    </main>
  );
}
