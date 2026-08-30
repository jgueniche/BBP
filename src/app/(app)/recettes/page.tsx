import { Download, Plus, Users } from "lucide-react";
import Link from "next/link";

import { CollectionDialog } from "@/components/recipes/collection-dialog";
import {
  RecipeCard,
  type RecipeCardData,
} from "@/components/recipes/recipe-card";
import { IlluCouscoussier } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { fr } from "@/i18n/fr";
import {
  COLLECTION_COLOR_CLASSES,
  type CollectionColor,
} from "@/lib/collections/colors";
import {
  getCalendarDays,
  loadCalendarSettings,
} from "@/lib/jewish-calendar/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

const t = fr.recettes;

type Filters = {
  tab?: string;
  q?: string;
  casher?: string;
  origine?: string;
  version?: string;
  tmax?: string;
  tri?: string;
  pessah?: string;
};

const CARD_SELECT =
  "id, title, slug, icon, origin, kashrut_class, is_fish, tags, prep_min, cook_min, version_kind, visibility, author_id";

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
    filters.tab === "carnet" || filters.tab === "carnets"
      ? filters.tab
      : "decouvrir";

  if (!isSupabaseConfigured) {
    return (
      <section>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
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
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
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
            ["carnet", t.tabs.book, "/recettes?tab=carnet"],
            ["carnets", t.tabs.collections, "/recettes?tab=carnets"],
          ] as const
        ).map(([key, label, href]) => (
          <Link
            key={key}
            href={href}
            aria-current={tab === key ? "page" : undefined}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-center text-sm font-bold",
              tab === key ? "bg-ink text-paper" : "text-ink-70",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "decouvrir" && <DiscoverTab filters={filters} />}
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
  if (filters.casher) query = query.eq("kashrut_class", filters.casher);
  if (filters.origine) query = query.eq("origin", filters.origine);
  if (filters.version) query = query.eq("version_kind", filters.version);
  if (filters.pessah) query = query.contains("tags", ["pessah"]);

  // During Pessah, suggest the hametz-free filter (session 13).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let pessahNow = false;
  if (user) {
    const userCalendar = await loadCalendarSettings(supabase, user.id);
    if (userCalendar.enabled) {
      const todayKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Paris",
      }).format(new Date());
      const [dayInfo] = await getCalendarDays(
        supabase,
        user.id,
        todayKey,
        todayKey,
      );
      pessahNow = dayInfo?.isPessah ?? false;
    }
  }

  const { data } = await query;
  const maxTime = filters.tmax ? parseInt(filters.tmax, 10) : null;
  let recipes = (data ?? []).filter(
    (recipe) =>
      maxTime === null ||
      (recipe.prep_min ?? 0) + (recipe.cook_min ?? 0) <= maxTime,
  );

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
        <Link
          href={filterHref(filters, {
            pessah: filters.pessah ? undefined : "1",
          })}
          className={chipClass(Boolean(filters.pessah))}
        >
          {t.filterPessah}
        </Link>
        {(["bassari", "halavi", "parve"] as const).map((k) => (
          <Link
            key={k}
            href={filterHref(filters, {
              casher: filters.casher === k ? undefined : k,
            })}
            className={chipClass(filters.casher === k)}
          >
            {fr.kashrut[k]}
          </Link>
        ))}
        {(["tunisie", "algerie", "maroc", "israel", "ashkenaze"] as const).map(
          (o) => (
            <Link
              key={o}
              href={filterHref(filters, {
                origine: filters.origine === o ? undefined : o,
              })}
              className={chipClass(filters.origine === o)}
            >
              {t.origins[o]}
            </Link>
          ),
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

      {pessahNow && !filters.pessah && (
        <p className="text-xs text-ink-50">
          {t.pessahSuggestion}{" "}
          <Link
            href={filterHref(filters, { pessah: "1" })}
            className="font-semibold underline underline-offset-2"
          >
            {t.filterPessah}
          </Link>
        </p>
      )}

      {recipes.length === 0 ? (
        <EmptyState
          illustration={<IlluCouscoussier size={64} />}
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
              />
            </li>
          ))}
        </ul>
      )}
    </>
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

  if ((mine ?? []).length === 0 && orderedSaved.length === 0) {
    return (
      <EmptyState
        illustration={<IlluCouscoussier size={64} />}
        title={t.bookEmpty}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {(mine ?? []).length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-extrabold">{t.myRecipes}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(mine ?? []).map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard recipe={recipe as RecipeCardData} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {orderedSaved.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-extrabold">
            {t.savedRecipes}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {orderedSaved.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard recipe={recipe as RecipeCardData} />
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
          illustration={<IlluCouscoussier size={64} />}
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
                    "flex h-full flex-col gap-2 rounded-lg border p-4 shadow-soft",
                    COLLECTION_COLOR_CLASSES[
                      collection.color as CollectionColor
                    ] ?? "bg-card",
                  )}
                >
                  <span className="text-3xl leading-none" aria-hidden>
                    {collection.icon}
                  </span>
                  <span className="font-display text-base font-extrabold leading-tight">
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
