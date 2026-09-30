import { ChefHat, Clock, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CreatorCredit } from "@/components/creators/creator-credit";
import { DietFactChips } from "@/components/diets/diet-facts";
import { fr } from "@/i18n/fr";
import { creditView } from "@/lib/creators/credit";
import { recipeDietFacts, type DietFacts } from "@/lib/diets/verdict";
import type { Totals } from "@/lib/nutrition/items";
import { recipeJsonLd, type RecipeForSeo } from "@/lib/seo/recipe-jsonld";
import { siteUrl } from "@/lib/site";
import { createAnonClient } from "@/lib/supabase/anon";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const t = fr.recettes;

// SEO (brief §10.14): the public share page is rendered statically and
// refreshed every hour (ISR); unknown slugs are generated on demand. Only
// members' original recipes are indexed: an import keeps a share page,
// never referenced (ADR-035).
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await createAnonClient()
    .from("recipes")
    .select("slug")
    .eq("visibility", "community")
    .eq("status", "published")
    .is("source_url", null)
    .order("updated_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((recipe) => ({ slug: recipe.slug }));
}

async function loadRecipe(
  slug: string,
): Promise<(RecipeForSeo & { id: string; facts: DietFacts }) | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = createAnonClient();
  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      "id, title, description, icon, slug, origin, category, prep_min, cook_min, servings, source_author, source_url, tags, nutrition_per_serving, created_at, updated_at",
    )
    .eq("slug", slug)
    .eq("visibility", "community")
    .eq("status", "published")
    .maybeSingle();
  if (!recipe) return null;

  const [{ data: ingredients }, { data: steps }] = await Promise.all([
    supabase
      .from("recipe_ingredients")
      .select("label_raw, section, grams, food_id")
      .eq("recipe_id", recipe.id)
      .order("position"),
    supabase
      .from("recipe_steps")
      .select("text, duration_sec, section")
      .eq("recipe_id", recipe.id)
      .order("position"),
  ]);

  const foodIds = (ingredients ?? [])
    .map((i) => i.food_id)
    .filter((id): id is string => id !== null);
  const { data: foods } =
    foodIds.length > 0
      ? await supabase.from("foods").select("id, name_fr").in("id", foodIds)
      : { data: [] };
  const foodName = new Map((foods ?? []).map((f) => [f.id, f.name_fr]));
  const facts = recipeDietFacts(
    (ingredients ?? []).map((i) => ({
      label: i.label_raw,
      grams: i.grams,
      foodName: i.food_id ? (foodName.get(i.food_id) ?? null) : null,
    })),
  );

  return {
    id: recipe.id,
    facts,
    slug: recipe.slug,
    title: recipe.title,
    description: recipe.description,
    icon: recipe.icon,
    origin: recipe.origin,
    category: recipe.category,
    prep_min: recipe.prep_min,
    cook_min: recipe.cook_min,
    servings: recipe.servings,
    source_author: recipe.source_author,
    source_url: recipe.source_url,
    tags: recipe.tags,
    nutrition_per_serving: (recipe.nutrition_per_serving ?? {}) as Totals,
    created_at: recipe.created_at,
    updated_at: recipe.updated_at,
    ingredients: ingredients ?? [],
    steps: steps ?? [],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await loadRecipe(slug);
  if (!recipe) {
    return { title: fr.notFound.title, robots: { index: false } };
  }
  const description = recipe.description ?? fr.app.tagline;
  const image = `/api/og/recette/${slug}`;
  return {
    title: recipe.title,
    description,
    ...(recipe.source_url ? { robots: { index: false, follow: false } } : {}),
    alternates: { canonical: `/r/${slug}` },
    openGraph: {
      type: "article",
      title: recipe.title,
      description,
      url: `/r/${slug}`,
      images: [{ url: image, width: 1200, height: 630, alt: recipe.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: recipe.title,
      description,
      images: [image],
    },
  };
}

type Section<T> = { name: string | null; items: T[] };

function groupBySection<T extends { section: string | null }>(
  items: T[],
): Section<T>[] {
  const sections: Section<T>[] = [];
  for (const item of items) {
    const name = item.section?.trim() || null;
    const last = sections.at(-1);
    if (last && last.name === name) last.items.push(item);
    else sections.push({ name, items: [item] });
  }
  return sections;
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const minutes = Math.round(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`
    : `${minutes} min`;
}

const NUTRIENTS: Array<{ key: keyof Totals; label: string; unit: string }> = [
  { key: "kcal", label: t.public.kcal, unit: "kcal" },
  { key: "protein_g", label: t.public.protein, unit: "g" },
  { key: "carb_g", label: t.public.carbs, unit: "g" },
  { key: "fat_g", label: t.public.fat, unit: "g" },
];

export default async function PublicRecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const recipe = await loadRecipe(slug);
  if (!recipe) notFound();

  const totalMin =
    recipe.prep_min === null && recipe.cook_min === null
      ? null
      : (recipe.prep_min ?? 0) + (recipe.cook_min ?? 0);
  const ingredientSections = groupBySection(recipe.ingredients);
  const stepSections = groupBySection(recipe.steps);
  const nutrition = NUTRIENTS.filter(
    ({ key }) => typeof recipe.nutrition_per_serving[key] === "number",
  );
  const jsonLd = JSON.stringify(
    recipeJsonLd(recipe, { siteUrl: siteUrl() }),
  ).replace(/</g, "\\u003c");

  let stepNumber = 0;

  return (
    <main
      id="main"
      className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8 lg:py-12"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      <article className="flex flex-col gap-4">
        <header className="rounded-lg border bg-card p-6 shadow-soft">
          <p className="text-xs font-semibold tracking-wide text-ink-50 uppercase">
            {fr.app.name}
          </p>
          {recipe.icon && (
            <p className="mt-3 text-5xl leading-none" aria-hidden>
              {recipe.icon}
            </p>
          )}
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight lg:text-4xl">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="mt-2 text-ink-70">{recipe.description}</p>
          )}
          <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-70">
            {totalMin !== null && (
              <div className="flex items-center gap-1.5">
                <Clock size={16} strokeWidth={2} aria-hidden />
                <dt className="sr-only">{t.public.time}</dt>
                <dd>
                  {totalMin} {t.minutes}
                </dd>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Users size={16} strokeWidth={2} aria-hidden />
              <dt className="sr-only">{t.public.servings}</dt>
              <dd>
                {recipe.servings} {t.servings}
              </dd>
            </div>
          </dl>
          <DietFactChips facts={recipe.facts} className="mt-3" />
          {recipe.source_url ? (
            <CreatorCredit
              view={creditView(
                {
                  sourceUrl: recipe.source_url,
                  sourceAuthor: recipe.source_author,
                },
                null,
              )}
              recipeId={recipe.id}
              className="mt-3"
            />
          ) : (
            recipe.source_author && (
              <p className="mt-3 text-xs text-ink-50">
                {t.importedFrom} {recipe.source_author}
              </p>
            )
          )}
        </header>

        {nutrition.length > 0 && (
          <section
            aria-labelledby="nutrition-title"
            className="rounded-lg border bg-card p-4 shadow-soft"
          >
            <h2
              id="nutrition-title"
              className="font-display text-lg font-semibold"
            >
              {t.nutrition}
            </h2>
            <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {nutrition.map(({ key, label, unit }) => (
                <div key={key} className="rounded-[10px] bg-shell px-3 py-2">
                  <dt className="text-xs text-ink-50">{label}</dt>
                  <dd className="font-mono text-lg font-semibold">
                    {Math.round(recipe.nutrition_per_serving[key] ?? 0)}
                    <span className="ml-1 text-xs text-ink-50">{unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-ink-50">{t.perServing}</p>
          </section>
        )}

        {recipe.ingredients.length > 0 && (
          <section
            aria-labelledby="ingredients-title"
            className="rounded-lg border bg-card p-4 shadow-soft"
          >
            <h2
              id="ingredients-title"
              className="font-display text-lg font-semibold"
            >
              {t.ingredients}
            </h2>
            {ingredientSections.map((section, index) => (
              <div key={index} className="mt-2">
                {section.name && (
                  <h3 className="text-sm font-semibold text-ink-70">
                    {section.name}
                  </h3>
                )}
                <ul className="mt-1 flex flex-col gap-1 text-sm">
                  {section.items.map((ingredient, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden className="text-ink-30">
                        •
                      </span>
                      {ingredient.label_raw}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {recipe.steps.length > 0 && (
          <section
            aria-labelledby="steps-title"
            className="rounded-lg border bg-card p-4 shadow-soft"
          >
            <h2
              id="steps-title"
              className="flex items-center gap-2 font-display text-lg font-semibold"
            >
              <ChefHat size={18} strokeWidth={2} aria-hidden />
              {t.steps}
            </h2>
            {stepSections.map((section, index) => (
              <div key={index} className="mt-2">
                {section.name && (
                  <h3 className="text-sm font-semibold text-ink-70">
                    {section.name}
                  </h3>
                )}
                <ol className="mt-1 flex flex-col gap-3 text-sm">
                  {section.items.map((step, i) => {
                    stepNumber += 1;
                    const duration = formatDuration(step.duration_sec);
                    return (
                      <li key={i} className="flex gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-xs font-semibold text-paper">
                          {stepNumber}
                        </span>
                        <div>
                          <p>{step.text}</p>
                          {duration && (
                            <p className="mt-0.5 text-xs text-ink-50">
                              {duration}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </section>
        )}

        <p className="text-xs text-ink-50">{fr.regimes.disclaimer}</p>
      </article>

      <Link
        href={`/recettes/${recipe.slug}`}
        className="rounded-[10px] border bg-boutargue px-5 py-3 text-center font-display text-sm font-semibold text-primary-foreground shadow-soft hover:bg-boutargue-deep hover:text-paper"
      >
        {t.openInApp}
      </Link>
      <p className="text-center text-xs text-ink-50">
        {fr.app.name} · {fr.app.tagline}
      </p>
    </main>
  );
}
