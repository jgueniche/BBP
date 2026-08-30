"use client";

import { Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  deleteFoodLog,
  saveFavorite,
  type MealType,
} from "@/app/(app)/journal/actions";
import { KashrutPill } from "@/components/ui/kashrut-pill";
import { fr } from "@/i18n/fr";
import type { KashrutClass } from "@/lib/kashrut/meal";
import type { FoodLogItem, Totals } from "@/lib/nutrition/items";

const t = fr.journal;

export type MealLogView = {
  id: string;
  meal: MealType;
  items: FoodLogItem[];
  totals: Totals;
  kashrut_class: KashrutClass | null;
};

const MEAL_ORDER: MealType[] = [
  "petit_dej",
  "dej",
  "collation",
  "diner",
  "chabbat_vendredi",
  "chabbat_samedi",
];

export function MealList({ logs }: { logs: MealLogView[] }) {
  const router = useRouter();

  async function onDelete(id: string) {
    await deleteFoodLog(id);
    router.refresh();
  }

  async function onSaveFavorite(log: MealLogView) {
    const label = window.prompt(t.favoriteNamePrompt);
    if (!label) return;
    try {
      await saveFavorite(label, log.items);
      toast(t.favoriteSaved);
      router.refresh();
    } catch {
      toast(t.parseFailed);
    }
  }

  const grouped = MEAL_ORDER.map((meal) => ({
    meal,
    entries: logs.filter((log) => log.meal === meal),
  })).filter((group) => group.entries.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {grouped.map(({ meal, entries }) => (
        <section key={meal}>
          <h2 className="font-display text-lg font-extrabold">
            {t.meals[meal]}
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
            {entries.map((log) => (
              <li
                key={log.id}
                className="rounded-lg border bg-card p-3 shadow-soft"
              >
                <div className="flex items-start justify-between gap-2">
                  <ul className="min-w-0 flex-1 text-sm">
                    {log.items.map((item, index) => (
                      <li key={index} className="flex justify-between gap-2">
                        <span className="truncate">{item.name}</span>
                        <span className="shrink-0 font-mono text-xs text-ink-50">
                          {Math.round(item.grams)} g
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSaveFavorite(log)}
                      aria-label={t.saveFavorite}
                      className="rounded-full p-1.5 text-ink-50 hover:bg-ink-10"
                    >
                      <Star size={16} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(log.id)}
                      aria-label={t.delete}
                      className="rounded-full p-1.5 text-ink-50 hover:bg-ink-10"
                    >
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {log.kashrut_class && (
                    <KashrutPill
                      kind={log.kashrut_class}
                      className="scale-90"
                    />
                  )}
                  {typeof log.totals.kcal === "number" && (
                    <span className="font-mono text-xs text-ink-70">
                      ~{Math.round(log.totals.kcal)} {t.totalsKcal}
                    </span>
                  )}
                  {typeof log.totals.protein_g === "number" && (
                    <span className="font-mono text-xs text-ink-50">
                      P {Math.round(log.totals.protein_g)} g
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
