import { Clock, Plus } from "lucide-react";
import Link from "next/link";

import { IlluCouscoussier } from "@/components/illustrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { KashrutPill } from "@/components/ui/kashrut-pill";
import { fr } from "@/i18n/fr";
import type { KashrutClass } from "@/lib/kashrut/meal";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const t = fr.recettes;

type Filters = {
  q?: string;
  casher?: string;
  origine?: string;
  version?: string;
  tmax?: string;
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

export default async function RecettesPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const filters = await searchParams;

  if (!isSupabaseConfigured) {
    return (
      <section>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          {t.title}
        </h1>
        <p className="mt-4 text-ink-70">{fr.auth.notConfigured}</p>
      </section>
    );
  }

  const supabase = await createClient();
  let query = supabase
    .from("recipes")
    .select(
      "id, title, slug, description, origin, kashrut_class, is_fish, tags, prep_min, cook_min, version_kind, visibility",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.q) {
    query = query.ilike("title", `%${filters.q}%`);
  }
  if (filters.casher) {
    query = query.eq("kashrut_class", filters.casher);
  }
  if (filters.origine) {
    query = query.eq("origin", filters.origine);
  }
  if (filters.version) {
    query = query.eq("version_kind", filters.version);
  }

  const { data } = await query;
  const maxTime = filters.tmax ? parseInt(filters.tmax, 10) : null;
  const recipes = (data ?? []).filter(
    (recipe) =>
      maxTime === null ||
      (recipe.prep_min ?? 0) + (recipe.cook_min ?? 0) <= maxTime,
  );

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          {t.title}
        </h1>
        <Button asChild size="sm">
          <Link href="/recettes/nouvelle">
            <Plus />
            {t.newRecipe}
          </Link>
        </Button>
      </header>

      <form action="/recettes" className="flex gap-2">
        <Input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder={t.searchPlaceholder}
        />
      </form>

      <div className="flex flex-wrap gap-1.5 text-xs">
        {(["bassari", "halavi", "parve"] as const).map((k) => (
          <Link
            key={k}
            href={filterHref(filters, {
              casher: filters.casher === k ? undefined : k,
            })}
            className={`rounded-full border-2 border-ink px-2.5 py-1 font-semibold ${filters.casher === k ? "bg-boutargue-soft" : "bg-paper"}`}
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
              className={`rounded-full border-2 border-ink px-2.5 py-1 font-semibold ${filters.origine === o ? "bg-boutargue-soft" : "bg-paper"}`}
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
            className={`rounded-full border-2 border-ink px-2.5 py-1 font-semibold ${filters.version === v ? "bg-boutargue-soft" : "bg-paper"}`}
          >
            {t.versions[v]}
          </Link>
        ))}
        <Link
          href={filterHref(filters, {
            tmax: filters.tmax === "30" ? undefined : "30",
          })}
          className={`rounded-full border-2 border-ink px-2.5 py-1 font-semibold ${filters.tmax === "30" ? "bg-boutargue-soft" : "bg-paper"}`}
        >
          ≤ 30 {t.minutes}
        </Link>
      </div>

      {recipes.length === 0 ? (
        <EmptyState
          illustration={<IlluCouscoussier size={64} />}
          title={t.empty}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/recettes/${recipe.slug}`}
                className="flex items-center gap-3 rounded-[20px] border-2 border-ink bg-paper p-3 shadow-sticker-sm transition-all active:translate-x-[2px] active:translate-y-[2px]"
              >
                <span className="flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-ink-10 text-ink-70">
                  <IlluCouscoussier size={40} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-base font-bold">
                    {recipe.title}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    {recipe.kashrut_class && (
                      <KashrutPill
                        kind={recipe.kashrut_class as KashrutClass}
                        isFish={recipe.is_fish}
                        className="scale-90"
                      />
                    )}
                    {recipe.version_kind === "proteine" && (
                      <Badge className="scale-90">{t.versions.proteine}</Badge>
                    )}
                    {recipe.origin && (
                      <span className="text-xs text-ink-50">
                        {t.origins[recipe.origin as keyof typeof t.origins]}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5 text-xs text-ink-50">
                      <Clock size={12} strokeWidth={2} aria-hidden />
                      {(recipe.prep_min ?? 0) + (recipe.cook_min ?? 0)}{" "}
                      {t.minutes}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
