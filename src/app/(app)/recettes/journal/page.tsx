import { ArrowLeft, Share2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { IlluCasserole } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { fr } from "@/i18n/fr";
import { formatCookedDay, groupByMonth } from "@/lib/journal/journal";
import { publicPhotoUrl } from "@/lib/social/photos";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import { PASTEL_BG, pastelFor } from "@/lib/utils/pastel";

import { DeleteEntryButton } from "./delete-entry-button";

const t = fr.recettes.journal;

export const metadata = { title: t.title };

export default async function JournalPage() {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS: the journal is only ever read by its owner.
  const { data: logs } = await supabase
    .from("cook_logs")
    .select("id, recipe_id, recipe_title, cooked_on, note, post_id, created_at")
    .eq("user_id", user.id)
    .order("cooked_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);

  const recipeIds = [
    ...new Set(
      (logs ?? [])
        .map((log) => log.recipe_id)
        .filter((id): id is string => id !== null),
    ),
  ];
  const postIds = (logs ?? [])
    .map((log) => log.post_id)
    .filter((id): id is string => id !== null);
  const [{ data: recipes }, { data: posts }] = await Promise.all([
    recipeIds.length > 0
      ? supabase.from("recipes").select("id, slug, icon").in("id", recipeIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0
      ? supabase.from("posts").select("id, photo_paths").in("id", postIds)
      : Promise.resolve({ data: [] }),
  ]);
  const recipeById = new Map((recipes ?? []).map((r) => [r.id, r]));
  const photoByPost = new Map(
    (posts ?? []).map((p) => [
      p.id,
      p.photo_paths[0] ? publicPhotoUrl(p.photo_paths[0]) : null,
    ]),
  );

  const months = groupByMonth(
    (logs ?? []).map((log) => ({
      ...log,
      cookedOn: log.cooked_on,
      createdAt: log.created_at,
    })),
  );

  return (
    <section className="flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <Link
          href="/recettes?tab=a-cuisiner"
          className="inline-flex items-center gap-1 text-xs font-semibold text-ink-50 hover:text-ink"
        >
          <ArrowLeft size={13} strokeWidth={2} aria-hidden />
          {t.toCookLink}
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t.title}
        </h1>
        <p className="text-sm text-ink-50">{t.intro}</p>
      </header>

      {months.length === 0 ? (
        <EmptyState
          illustration={<IlluCasserole size={64} />}
          title={t.empty}
          hint={t.emptyHint}
        />
      ) : (
        months.map((month) => (
          <section key={month.key} className="flex flex-col gap-2">
            <h2 className="flex items-baseline gap-2 font-display text-lg font-semibold">
              {month.label}
              <span className="font-sans text-xs font-medium text-ink-50">
                {month.entries.length === 1
                  ? t.countOne
                  : t.count.replace("{n}", String(month.entries.length))}
              </span>
            </h2>
            <ul className="flex flex-col gap-2">
              {month.entries.map((entry) => {
                const recipe = entry.recipe_id
                  ? recipeById.get(entry.recipe_id)
                  : undefined;
                const photo = entry.post_id
                  ? photoByPost.get(entry.post_id)
                  : null;
                return (
                  <li
                    key={entry.id}
                    className="flex items-start gap-3 rounded-lg border bg-card p-3"
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt=""
                        loading="lazy"
                        className="size-14 shrink-0 rounded-[10px] object-cover"
                      />
                    ) : (
                      <span
                        className={cn(
                          "flex size-14 shrink-0 items-center justify-center rounded-[10px]",
                          PASTEL_BG[pastelFor(recipe?.slug ?? entry.id)],
                        )}
                      >
                        {recipe?.icon ? (
                          <span className="text-2xl leading-none" aria-hidden>
                            {recipe.icon}
                          </span>
                        ) : (
                          <IlluCasserole size={34} />
                        )}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-ink-50">
                        {formatCookedDay(entry.cookedOn)}
                      </p>
                      {recipe ? (
                        <Link
                          href={`/recettes/${recipe.slug}`}
                          className="block truncate font-display text-base font-semibold hover:underline"
                        >
                          {entry.recipe_title}
                        </Link>
                      ) : (
                        <p className="truncate font-display text-base font-semibold">
                          {entry.recipe_title}
                          <span className="ml-1.5 font-sans text-[11px] font-medium text-ink-50">
                            {t.gone}
                          </span>
                        </p>
                      )}
                      {entry.note && (
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-70">
                          {entry.note}
                        </p>
                      )}
                      {entry.post_id && (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-beurre px-1.5 py-0.5 text-[11px] font-semibold text-ink-70">
                          <Share2 size={11} strokeWidth={2} aria-hidden />
                          {t.shared}
                        </p>
                      )}
                    </div>
                    <DeleteEntryButton entryId={entry.id} />
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}
