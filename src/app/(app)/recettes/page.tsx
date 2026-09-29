import { Download, NotebookPen, Plus, Users } from "lucide-react";
import Link from "next/link";

import { CollectionDialog } from "@/components/recipes/collection-dialog";
import { ToCookRemoveButton } from "@/components/recipes/to-cook-remove-button";
import {
  RecipeCard,
  type RecipeCardData,
} from "@/components/recipes/recipe-card";
import { IlluCasserole } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { fr } from "@/i18n/fr";
import {
  COLLECTION_COLOR_CLASSES,
  type CollectionColor,
} from "@/lib/collections/colors";
import { loadFoodRules } from "@/lib/diets/preferences";
import { loadRecipeIngredients, verdictStatuses } from "@/lib/diets/recipes";
import { DIETS, type Diet } from "@/lib/diets/types";
import { evaluateRecipe } from "@/lib/diets/verdict";
import { formatCookedDay } from "@/lib/journal/journal";
import { CUISINE_GROUPS } from "@/lib/recipes/cuisines";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

const t = fr.recettes;

type Filters = {
  tab?: string;
  q?: string;
  cuisine?: string;
  regime?: string;
  pourmoi?: string;
  version?: string;
  tmax?: string;
  tri?: string;
};

const CARD_SELECT =
  "id, title, slug, icon, origin, tags, prep_min, cook_min, version_kind, visibility, author_id";

const STATUS_ORDER = {
  compatible: 0,
  adaptable: 1,
  verify: 2,
  incompatible: 3,
};

function filterHref(current: Filters, patch: Partial<Filters>): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...patch };
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/recettes?${qs}` : "/recettes";
}

function chipClass(active: boolean): string {
  return `rounded-full border px-2.5 py-1 text-xs font-semibold ${active ? "bg-boutargue-tint" : "bg-card"}`;
}

export default async function RecettesPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const filters = await searchParams;
  const tab =
    filters.tab === "carnet" ||
    filters.tab === "carnets" ||
    filters.tab === "a-cuisiner"
      ? filters.tab
      : "decouvrir";

  if (!isSupabaseConfigured) {
    return (
      <section>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t.title}
        </h1>
        <p className="mt-4 text-ink-70">{fr.auth.notConfigured}</p>
      </section>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t.title}
        </h1>
        <div className="ml-auto flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/recettes/importer">
              <Download />
              {t.importCta}
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/recettes/nouvelle">
              <Plus />
              {t.newRecipe}
            </Link>
          </Button>
        </div>
      </header>

      <nav
        aria-label={t.title}
        className="flex gap-1 rounded-full border bg-card p-1"
      >
        {(
          [
            ["decouvrir", t.tabs.discover, "/recettes"],
            ["a-cuisiner", t.tabs.toCook, "/recettes?tab=a-cuisiner"],
            ["carnet", t.tabs.book, "/recettes?tab=carnet"],
            ["carnets", t.tabs.collections, "/recettes?tab=carnets"],
          ] as const
        ).map(([key, label, href]) => (
          <Link
            key={key}
            href={href}
            aria-current={tab === key ? "page" : undefined}
            className={cn(
              "flex-1 rounded-full px-2 py-1.5 text-center text-sm font-bold whitespace-nowrap sm:px-3",
              tab === key ? "bg-ink text-paper" : "text-ink-70",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "decouvrir" && <DiscoverTab filters={filters} />}
      {tab === "a-cuisiner" && <ToCookTab userId={user?.id ?? null} />}
      {tab === "carnet" && <BookTab userId={user?.id ?? null} />}
      {tab === "carnets" && <CollectionsTab userId={user?.id ?? null} />}
    </section>
  );
}

async function DiscoverTab({ filters }: { filters: Filters }) {
  const supabase = await createClient();
  let query = supabase
    .from("recipes")
    .select(CARD_SELECT)
    .eq("status", "published")
    .eq("visibility", "community")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.q) query = query.ilike("title", `%${filters.q}%`);
  if (filters.cuisine) query = query.eq("origin", filters.cuisine);
  if (filters.version) query = query.eq("version_kind", filters.version);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rules = user ? await loadFoodRules(supabase, user.id) : null;
  const regime = (DIETS as readonly string[]).includes(filters.regime ?? "")
    ? (filters.regime as Diet)
    : null;

  const { data } = await query;
  const maxTime = filters.tmax ? parseInt(filters.tmax, 10) : null;
  let recipes = (data ?? []).filter(
    (recipe) =>
      maxTime === null ||
      (recipe.prep_min ?? 0) + (recipe.cook_min ?? 0) <= maxTime,
  );

  // Diet facts are computed from the ingredients, never stored on people.
  const allIds = recipes.map((r) => r.id);
  const [statuses, ingredientsById] = await Promise.all([
    verdictStatuses(supabase, rules, allIds),
    regime
      ? loadRecipeIngredients(supabase, allIds)
      : Promise.resolve(new Map()),
  ]);
  if (regime) {
    recipes = recipes.filter(
      (recipe) =>
        evaluateRecipe(ingredientsById.get(recipe.id) ?? [], {
          diets: [regime],
          allergens: [],
          dislikes: [],
        })?.status === "compatible",
    );
  }
  const mineOnly = Boolean(filters.pourmoi) && rules !== null;
  if (mineOnly) {
    recipes = recipes
      .filter((recipe) => {
        const status = statuses.get(recipe.id);
        return status === "compatible" || status === "adaptable";
      })
      .sort(
        (a, b) =>
          STATUS_ORDER[statuses.get(a.id) ?? "compatible"] -
          STATUS_ORDER[statuses.get(b.id) ?? "compatible"],
      );
  }

  const ids = recipes.map((r) => r.id);
  const authorIds = [
    ...new Set(
      recipes.map((r) => r.author_id).filter((id): id is string => id !== null),
    ),
  ];
  const [{ data: stats }, { data: authors }] = await Promise.all([
    ids.length > 0
      ? supabase
          .from("recipe_social_stats")
          .select("recipe_id, likes")
          .in("recipe_id", ids)
      : Promise.resolve({ data: [] }),
    authorIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", authorIds)
      : Promise.resolve({ data: [] }),
  ]);
  const likesById = new Map(
    (stats ?? []).map((s) => [s.recipe_id, s.likes] as const),
  );
  const authorById = new Map(
    (authors ?? []).map(
      (p) => [p.id, p.display_name ?? p.username ?? null] as const,
    ),
  );

  if (filters.tri === "top") {
    recipes = [...recipes].sort(
      (a, b) => (likesById.get(b.id) ?? 0) - (likesById.get(a.id) ?? 0),
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <form action="/recettes" className="w-full sm:w-72">
          <Input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder={t.searchPlaceholder}
          />
        </form>
        <Link
          href={filterHref(filters, {
            tri: filters.tri === "top" ? undefined : "top",
          })}
          className={chipClass(filters.tri === "top")}
        >
          {t.sortTop}
        </Link>
        {rules && (
          <Link
            href={filterHref(filters, {
              pourmoi: filters.pourmoi ? undefined : "1",
            })}
            className={chipClass(Boolean(filters.pourmoi))}
          >
            {fr.regimes.filterMine}
          </Link>
        )}
        {(["boutargue", "proteine"] as const).map((v) => (
          <Link
            key={v}
            href={filterHref(filters, {
              version: filters.version === v ? undefined : v,
            })}
            className={chipClass(filters.version === v)}
          >
            {t.versions[v]}
          </Link>
        ))}
        <Link
          href={filterHref(filters, {
            tmax: filters.tmax === "30" ? undefined : "30",
          })}
          className={chipClass(filters.tmax === "30")}
        >
          ≤ 30 {t.minutes}
        </Link>
      </div>

      <form
        action="/recettes"
        className="flex flex-wrap items-center gap-2 text-xs"
      >
        {(["q", "pourmoi", "version", "tmax", "tri"] as const).map((key) =>
          filters[key] ? (
            <input key={key} type="hidden" name={key} value={filters[key]} />
          ) : null,
        )}
        <select
          name="cuisine"
          aria-label={t.filters.origin}
          defaultValue={filters.cuisine ?? ""}
          className="rounded-full border bg-card px-2.5 py-1 font-semibold"
        >
          <option value="">{t.filterCuisineAll}</option>
          {CUISINE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.cuisines.map((cuisine) => (
                <option key={cuisine} value={cuisine}>
                  {t.origins[cuisine]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select
          name="regime"
          aria-label={fr.regimes.filterDiet}
          defaultValue={regime ?? ""}
          className="rounded-full border bg-card px-2.5 py-1 font-semibold"
        >
          <option value="">{fr.regimes.filterDietAll}</option>
          {DIETS.map((diet) => (
            <option key={diet} value={diet}>
              {fr.regimes.facts[diet]}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary">
          {t.filterApply}
        </Button>
      </form>

      {recipes.length === 0 ? (
        <EmptyState
          illustration={<IlluCasserole size={64} />}
          title={t.empty}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard
                recipe={recipe as RecipeCardData}
                likes={likesById.get(recipe.id) ?? 0}
                author={authorById.get(recipe.author_id ?? "") ?? null}
                verdict={statuses.get(recipe.id) ?? null}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function ToCookTab({ userId }: { userId: string | null }) {
  if (!userId) return null;
  const supabase = await createClient();
  const [{ data: items }, { data: recent }] = await Promise.all([
    supabase
      .from("to_cook")
      .select("recipe_id, source")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("cook_logs")
      .select("id, recipe_id, recipe_title, cooked_on")
      .eq("user_id", userId)
      .order("cooked_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3),
  ]);
  const ids = (items ?? []).map((item) => item.recipe_id);
  const recentIds = (recent ?? [])
    .map((log) => log.recipe_id)
    .filter((id): id is string => id !== null);
  const [{ data: recipes }, { data: recentRecipes }] = await Promise.all([
    ids.length > 0
      ? supabase.from("recipes").select(CARD_SELECT).in("id", ids)
      : Promise.resolve({ data: [] }),
    recentIds.length > 0
      ? supabase.from("recipes").select("id, slug").in("id", recentIds)
      : Promise.resolve({ data: [] }),
  ]);
  const byId = new Map((recipes ?? []).map((r) => [r.id, r]));
  const slugById = new Map((recentRecipes ?? []).map((r) => [r.id, r.slug]));
  const queue = (items ?? []).flatMap((item) => {
    const recipe = byId.get(item.recipe_id);
    return recipe ? [{ item, recipe }] : [];
  });
  const rules = await loadFoodRules(supabase, userId);
  const statuses = await verdictStatuses(
    supabase,
    rules,
    queue.map((entry) => entry.recipe.id),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-sm text-ink-50">{t.toCook.intro}</p>
        <Button asChild variant="secondary" size="sm">
          <Link href="/recettes/journal">
            <NotebookPen />
            {t.toCook.journalLink}
          </Link>
        </Button>
      </div>
      {queue.length === 0 ? (
        <EmptyState
          illustration={<IlluCasserole size={64} />}
          title={t.toCook.empty}
          hint={t.toCook.emptyHint}
          action={
            <Button asChild size="sm">
              <Link href="/recettes/importer">
                <Download />
                {t.importCta}
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {queue.map(({ item, recipe }) => (
            <li key={recipe.id} className="relative">
              <RecipeCard
                recipe={recipe as RecipeCardData}
                verdict={statuses.get(recipe.id) ?? null}
              />
              {item.source === "import" && (
                <span className="pointer-events-none absolute right-10 top-2 rounded-full bg-ciel px-1.5 py-0.5 text-[10px] font-semibold text-ink-70">
                  {t.toCook.fromImport}
                </span>
              )}
              <ToCookRemoveButton recipeId={recipe.id} />
            </li>
          ))}
        </ul>
      )}
      {(recent ?? []).length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-lg font-semibold">
            {t.toCook.recent}
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {(recent ?? []).map((log) => {
              const slug = log.recipe_id ? slugById.get(log.recipe_id) : null;
              return (
                <li key={log.id} className="flex items-baseline gap-2">
                  <span className="shrink-0 text-xs text-ink-50">
                    {formatCookedDay(log.cooked_on)}
                  </span>
                  {slug ? (
                    <Link
                      href={`/recettes/${slug}`}
                      className="truncate font-medium hover:underline"
                    >
                      {log.recipe_title}
                    </Link>
                  ) : (
                    <span className="truncate font-medium">
                      {log.recipe_title}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

async function BookTab({ userId }: { userId: string | null }) {
  if (!userId) return null;
  const supabase = await createClient();

  const [{ data: mine }, { data: saves }] = await Promise.all([
    supabase
      .from("recipes")
      .select(CARD_SELECT)
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("recipe_saves")
      .select("recipe_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const savedIds = (saves ?? []).map((s) => s.recipe_id);
  const { data: savedRecipes } =
    savedIds.length > 0
      ? await supabase.from("recipes").select(CARD_SELECT).in("id", savedIds)
      : { data: [] };
  const savedById = new Map((savedRecipes ?? []).map((r) => [r.id, r]));
  const orderedSaved = savedIds
    .map((id) => savedById.get(id))
    .filter((r): r is NonNullable<typeof r> => r !== undefined)
    .filter((r) => r.author_id !== userId);

  const rules = await loadFoodRules(supabase, userId);
  const statuses = await verdictStatuses(supabase, rules, [
    ...(mine ?? []).map((r) => r.id),
    ...orderedSaved.map((r) => r.id),
  ]);

  if ((mine ?? []).length === 0 && orderedSaved.length === 0) {
    return (
      <EmptyState
        illustration={<IlluCasserole size={64} />}
        title={t.bookEmpty}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {(mine ?? []).length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold">{t.myRecipes}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(mine ?? []).map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard
                  recipe={recipe as RecipeCardData}
                  verdict={statuses.get(recipe.id) ?? null}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      {orderedSaved.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold">
            {t.savedRecipes}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {orderedSaved.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard
                  recipe={recipe as RecipeCardData}
                  verdict={statuses.get(recipe.id) ?? null}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

async function CollectionsTab({ userId }: { userId: string | null }) {
  if (!userId) return null;
  const supabase = await createClient();

  const { data: collections } = await supabase
    .from("collections")
    .select("id, name, icon, color, description, owner_id")
    .order("created_at");
  const ids = (collections ?? []).map((c) => c.id);
  const { data: links } =
    ids.length > 0
      ? await supabase
          .from("collection_recipes")
          .select("collection_id")
          .in("collection_id", ids)
      : { data: [] };
  const counts = new Map<string, number>();
  for (const link of links ?? []) {
    counts.set(link.collection_id, (counts.get(link.collection_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-3">
      <CollectionDialog
        trigger={
          <Button variant="secondary" size="sm" className="self-start">
            <Plus />
            {t.collections.new}
          </Button>
        }
      />
      {(collections ?? []).length === 0 ? (
        <EmptyState
          illustration={<IlluCasserole size={64} />}
          title={t.collections.empty}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {(collections ?? []).map((collection) => {
            const count = counts.get(collection.id) ?? 0;
            return (
              <li key={collection.id}>
                <Link
                  href={`/recettes/carnets/${collection.id}`}
                  className={cn(
                    "flex h-full flex-col gap-2 rounded-lg p-4 transition-shadow hover:shadow-soft",
                    COLLECTION_COLOR_CLASSES[
                      collection.color as CollectionColor
                    ] ?? "bg-card",
                  )}
                >
                  <span className="text-3xl leading-none" aria-hidden>
                    {collection.icon}
                  </span>
                  <span className="font-display text-base font-semibold leading-tight">
                    {collection.name}
                  </span>
                  <span className="mt-auto flex items-center gap-2 text-xs text-ink-70">
                    {count}{" "}
                    {count === 1
                      ? t.collections.recipeLabel
                      : t.collections.recipesLabel}
                    {collection.owner_id !== userId && (
                      <span className="inline-flex items-center gap-0.5 font-semibold">
                        <Users size={12} strokeWidth={2} aria-hidden />
                        {t.collections.sharedWithMe}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
