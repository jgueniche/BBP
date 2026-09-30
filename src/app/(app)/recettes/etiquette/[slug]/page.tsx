import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { IlluCasserole } from "@/components/illustrations";
import {
  RecipeCard,
  type RecipeCardData,
} from "@/components/recipes/recipe-card";
import { EmptyState } from "@/components/ui/empty-state";
import { fr } from "@/i18n/fr";
import { loadFoodRules } from "@/lib/diets/preferences";
import { coverSrc } from "@/lib/recipes/photos";
import { verdictStatuses } from "@/lib/diets/recipes";
import { loadTagRegistry } from "@/lib/recipes/tags";
import { slugsCoveredBy } from "@/lib/social/tags";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const t = fr.recettes;

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();

  const { data: tag } = await supabase
    .from("tags")
    .select("id, slug, label, canonical_id")
    .eq("slug", decodeURIComponent(slug))
    .maybeSingle();
  if (!tag) notFound();

  // A synonym leads to its reference tag.
  if (tag.canonical_id) {
    const { data: canonical } = await supabase
      .from("tags")
      .select("slug")
      .eq("id", tag.canonical_id)
      .maybeSingle();
    if (canonical) redirect(`/recettes/etiquette/${canonical.slug}`);
  }

  const registry = await loadTagRegistry(supabase);
  const covered = slugsCoveredBy(tag.id, registry);
  const { data: children } = await supabase
    .from("tags")
    .select("slug, label")
    .eq("parent_id", tag.id)
    .is("canonical_id", null)
    .order("label");

  const { data: recipes } = await supabase
    .from("recipes")
    .select(
      "id, title, slug, icon, origin, tags, prep_min, cook_min, version_kind, author_id, photo_paths",
    )
    .eq("status", "published")
    .overlaps("tags", covered)
    .order("created_at", { ascending: false })
    .limit(100);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rules = user ? await loadFoodRules(supabase, user.id) : null;
  const statuses = await verdictStatuses(
    supabase,
    rules,
    (recipes ?? []).map((r) => r.id),
  );

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-50">
          {t.tagsPage.title}
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          #{tag.label}
        </h1>
      </header>

      {(children ?? []).length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-ink-50">{t.tagsPage.subcategories} :</span>
          {(children ?? []).map((child) => (
            <Link
              key={child.slug}
              href={`/recettes/etiquette/${child.slug}`}
              className="rounded-full border bg-card px-2.5 py-1 font-semibold hover:border-ink"
            >
              #{child.label}
            </Link>
          ))}
        </div>
      )}

      {(recipes ?? []).length === 0 ? (
        <EmptyState
          illustration={<IlluCasserole size={64} />}
          title={t.tagsPage.empty}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(recipes ?? []).map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard
                recipe={recipe as RecipeCardData}
                photo={coverSrc(recipe.photo_paths?.[0], { thumb: true })}
                verdict={statuses.get(recipe.id) ?? null}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
