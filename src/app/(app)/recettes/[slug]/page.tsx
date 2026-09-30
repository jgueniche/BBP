import { ChefHat, Clock, ExternalLink, Timer, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CommentsSection } from "@/components/recipes/comments-section";
import { CookedButton } from "@/components/recipes/cooked-button";
import { CookedGallery } from "@/components/recipes/cooked-gallery";
import { NoteEditor } from "@/components/recipes/note-editor";
import { SocialBar } from "@/components/recipes/social-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DietFactChips } from "@/components/diets/diet-facts";
import { ForYouPanel } from "@/components/diets/for-you-panel";
import { fr } from "@/i18n/fr";
import { loadFoodRules } from "@/lib/diets/preferences";
import { loadRecipeIngredients } from "@/lib/diets/recipes";
import { evaluateRecipe, recipeDietFacts } from "@/lib/diets/verdict";
import { formatCookedDay } from "@/lib/journal/journal";
import {
  loadCommunityVersions,
  loadCooked,
  loadCreditChain,
  loadTips,
} from "@/lib/recipes/social";
import { creditLine } from "@/lib/recipes/versions";
import type { Totals } from "@/lib/nutrition/items";
import { profileHref } from "@/lib/social/handles";
import { loadMembers } from "@/lib/social/members";
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
    tips,
    likedRes,
    savedRes,
    noteRes,
    engineIngredients,
    rules,
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
    user ? loadTips(supabase, recipe.id, user.id) : Promise.resolve([]),
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
    loadRecipeIngredients(supabase, [recipe.id]),
    user ? loadFoodRules(supabase, user.id) : Promise.resolve(null),
  ]);
  const [cooked, chain, communityVersions, toCookRes] = await Promise.all([
    loadCooked(supabase, recipe.id, user?.id ?? null),
    loadCreditChain(supabase, recipe.parent_recipe_id),
    loadCommunityVersions(supabase, recipe.id),
    user
      ? supabase
          .from("to_cook")
          .select("id")
          .eq("user_id", user.id)
          .eq("recipe_id", recipe.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const credit = creditLine(chain);
  const forEngine = engineIngredients.get(recipe.id) ?? [];
  const verdict = evaluateRecipe(forEngine, rules);
  const facts = recipeDietFacts(forEngine);

  const members = await loadMembers(
    supabase,
    recipe.author_id ? [recipe.author_id] : [],
  );
  const author = recipe.author_id ? members.get(recipe.author_id) : undefined;

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
  const authorName = recipe.author_id ? (author?.name ?? t.authorHidden) : null;

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
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {recipe.title}
            </h1>
            {authorName && recipe.author_id && (
              <p className="text-xs text-ink-50">
                {t.authorBy}{" "}
                <Link
                  href={profileHref({
                    id: recipe.author_id,
                    handle: author?.handle ?? null,
                  })}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {authorName}
                </Link>
              </p>
            )}
          </div>
        </div>
        {recipe.description && (
          <p className="text-sm text-ink-70">{recipe.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
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
              <Link
                key={tag}
                href={`/recettes/etiquette/${encodeURIComponent(tag)}`}
                className="rounded-full bg-ink-10 px-2 py-0.5 text-[11px] font-medium text-ink-70 hover:bg-lilas"
              >
                #{tag}
              </Link>
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

      <DietFactChips facts={facts} />

      {user && <ForYouPanel verdict={verdict} rules={rules} />}

      {user && (
        <SocialBar
          recipeId={recipe.id}
          initialLiked={likedRes.data !== null}
          initialSaved={savedRes.data !== null}
          initialLikes={stats?.likes ?? 0}
          initialToCook={toCookRes.data !== null}
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
              {credit ?? `${t.versionOf} « ${parent.title} »`}
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

      {user && cooked.mine.last && (
        <p className="text-sm text-ink-70">
          {(cooked.mine.times === 1 ? t.cooked.mineOne : t.cooked.mine)
            .replace("{n}", String(cooked.mine.times))
            .replace("{date}", formatCookedDay(cooked.mine.last))}{" "}
          <Link
            href="/recettes/journal"
            className="font-semibold text-boutargue-deep underline-offset-2 hover:underline"
          >
            {t.journal.title}
          </Link>
        </p>
      )}

      {user && (
        <div className="flex flex-wrap items-center gap-2">
          <CookedButton recipeId={recipe.id} />
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
        <section className="rounded-lg bg-menthe p-4">
          <h2 className="font-display text-base font-semibold text-ink">
            {t.substitutionsTitle}
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-70">
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
        <h2 className="font-display text-lg font-semibold">{t.ingredients}</h2>
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
        <h2 className="font-display text-lg font-semibold">{t.steps}</h2>
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
          <h2 className="font-display text-lg font-semibold">{t.nutrition}</h2>
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
              <div key={label} className="rounded-lg border p-2">
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

      <CookedGallery
        count={cooked.count}
        entries={cooked.entries}
        friends={cooked.friends}
      />

      {communityVersions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold">
            {t.versionsTab.title}
            <span className="ml-1.5 font-mono text-sm text-ink-50">
              {communityVersions.length}
            </span>
          </h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {communityVersions.map((version) => (
              <li key={version.slug}>
                <Link
                  href={`/recettes/${version.slug}`}
                  className="font-medium underline underline-offset-4"
                >
                  {version.title}
                </Link>
                <span className="text-ink-50">
                  {" "}
                  {t.authorBy} {version.authorName ?? t.authorHidden}
                </span>
              </li>
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
          initialComments={tips}
        />
      )}

      <p className="text-[11px] text-ink-50">{fr.regimes.disclaimer}</p>
    </article>
  );
}
