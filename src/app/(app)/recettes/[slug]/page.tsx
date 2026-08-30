import { ChefHat, Clock, ExternalLink, Timer, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CommentsSection } from "@/components/recipes/comments-section";
import { NoteEditor } from "@/components/recipes/note-editor";
import { SocialBar } from "@/components/recipes/social-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    { data: stats },
    { data: comments },
    likedRes,
    savedRes,
    noteRes,
  ] = await Promise.all([
    supabase
      .from("recipe_ingredients")
      .select("id, label_raw, qty, unit, grams, food_id, section")
      .eq("recipe_id", recipe.id)
      .order("position"),
    supabase
      .from("recipe_steps")
      .select("id, text, duration_sec, section")
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
    supabase
      .from("recipe_social_stats")
      .select("likes, saves, comments")
      .eq("recipe_id", recipe.id)
      .maybeSingle(),
    supabase
      .from("recipe_comments")
      .select("id, text, created_at, user_id")
      .eq("recipe_id", recipe.id)
      .order("created_at")
      .limit(100),
    user
      ? supabase
          .from("recipe_likes")
          .select("recipe_id")
          .eq("recipe_id", recipe.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("recipe_saves")
          .select("recipe_id")
          .eq("recipe_id", recipe.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("recipe_notes")
          .select("text")
          .eq("recipe_id", recipe.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const commenterIds = [...new Set((comments ?? []).map((c) => c.user_id))];
  const authorIds = [
    ...new Set(
      [...commenterIds, recipe.author_id].filter(
        (id): id is string => id !== null,
      ),
    ),
  ];
  const { data: profiles } =
    authorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", authorIds)
      : { data: [] };
  const nameById = new Map(
    (profiles ?? []).map(
      (p) => [p.id, p.display_name ?? p.username ?? null] as const,
    ),
  );

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
  const authorName = recipe.author_id
    ? (nameById.get(recipe.author_id) ?? t.authorHidden)
    : null;

  // Group consecutive steps into named phases; numbering stays global.
  const phases: Array<{
    name: string | null;
    steps: NonNullable<typeof steps>;
  }> = [];
  for (const step of steps ?? []) {
    const last = phases.at(-1);
    if (last && last.name === step.section) last.steps.push(step);
    else phases.push({ name: step.section, steps: [step] });
  }
  let stepNumber = 0;

  return (
    <article className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          {recipe.icon && (
            <span className="text-4xl leading-none" aria-hidden>
              {recipe.icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              {recipe.title}
            </h1>
            {authorName && (
              <p className="text-xs text-ink-50">
                {t.authorBy} {authorName}
              </p>
            )}
          </div>
        </div>
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
        {recipe.source_url && (
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-50">
            {t.importedFrom} {recipe.source_author ?? "—"}
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium underline underline-offset-2"
            >
              {t.viewOriginal}
              <ExternalLink size={11} strokeWidth={2} aria-hidden />
            </a>
          </p>
        )}
      </header>

      {user && (
        <SocialBar
          recipeId={recipe.id}
          initialLiked={likedRes.data !== null}
          initialSaved={savedRes.data !== null}
          initialLikes={stats?.likes ?? 0}
          publicSlug={
            recipe.visibility === "community" && recipe.status === "published"
              ? recipe.slug
              : null
          }
        />
      )}

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
        <div className="flex flex-wrap items-center gap-2">
          {(steps ?? []).length > 0 && (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/recettes/${recipe.slug}/cuisine`}>
                <ChefHat />
                {t.cook.start}
              </Link>
            </Button>
          )}
          <RecipeActions
            recipeId={recipe.id}
            slug={recipe.slug}
            isOwner={isOwner}
            canGenerateProtein={
              recipe.version_kind === "boutargue" && !hasProteinVersion
            }
          />
        </div>
      )}

      {substitutions && substitutions.length > 0 && (
        <section className="rounded-lg border bg-boutargue-tint p-4">
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
          {(ingredients ?? []).map((ingredient, index) => {
            const previous = (ingredients ?? [])[index - 1];
            const showSection =
              ingredient.section !== null &&
              ingredient.section !== (previous?.section ?? null);
            return (
              <li key={ingredient.id}>
                {showSection && (
                  <p className="mb-1 mt-2 text-xs font-bold uppercase tracking-wide text-ink-50">
                    {ingredient.section}
                  </p>
                )}
                <div className="flex justify-between gap-2 border-b border-ink-10 pb-1.5">
                  <span>{ingredient.label_raw}</span>
                  <span className="shrink-0 font-mono text-xs text-ink-50">
                    {ingredient.qty
                      ? `${ingredient.qty} ${ingredient.unit ?? ""}`
                      : ingredient.grams
                        ? `${ingredient.grams} g`
                        : ""}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg font-extrabold">{t.steps}</h2>
        <div className="mt-2 flex flex-col gap-4">
          {phases.map((phase, phaseIndex) => (
            <div key={phaseIndex}>
              {phase.name && (
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-50">
                  {phase.name}
                </p>
              )}
              <ol className="flex list-none flex-col gap-3">
                {phase.steps.map((step) => {
                  stepNumber += 1;
                  return (
                    <li key={step.id} className="flex gap-3 text-sm">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold">
                        {stepNumber}
                      </span>
                      <span className="min-w-0">
                        {step.text}
                        {step.duration_sec !== null && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-ink-10 px-1.5 py-0.5 align-middle font-mono text-[11px] font-semibold text-ink-70">
                            <Timer size={11} strokeWidth={2} aria-hidden />
                            {Math.round(step.duration_sec / 60)} {t.minutes}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
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
                className="rounded-lg border p-2"
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
        <section className="rounded-lg border border-warn/40 bg-card p-3">
          <h2 className="text-sm font-bold text-warn">{t.flagsTitle}</h2>
          <ul className="mt-1 text-xs text-ink-70">
            {recipe.kosher_flags.map((flag, i) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        </section>
      )}

      {user && (
        <NoteEditor
          recipeId={recipe.id}
          initialText={noteRes.data?.text ?? ""}
        />
      )}

      {user && (
        <CommentsSection
          recipeId={recipe.id}
          currentUserId={user.id}
          isRecipeAuthor={isOwner}
          initialComments={(comments ?? []).map((comment) => ({
            ...comment,
            authorName: nameById.get(comment.user_id) ?? null,
          }))}
        />
      )}

      <p className="text-[11px] text-ink-50">{t.kosherDisclaimer}</p>
    </article>
  );
}
