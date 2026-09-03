"use client";

import { CloudOff, Trash2 } from "lucide-react";
import { useSyncExternalStore } from "react";

import { fr } from "@/i18n/fr";
import type { QueuedMeal } from "@/lib/nutrition/log-input";
import {
  getQueueSnapshot,
  getServerQueueSnapshot,
  removeQueuedMeal,
  subscribeQueue,
} from "@/lib/pwa/offline-store";

const t = fr.journal;

function describe(meal: QueuedMeal): string {
  if (meal.kind === "favorite") return `★ ${meal.label}`;
  return meal.items
    .map((item) => `${item.name} ${Math.round(item.grams)} g`)
    .join(", ");
}

/** Meals captured offline for the displayed day, until the queue syncs. */
export function PendingMeals({ date }: { date: string }) {
  const queue = useSyncExternalStore(
    subscribeQueue,
    getQueueSnapshot,
    getServerQueueSnapshot,
  );
  const entries = queue.filter((entry) => entry.meal.date === date);
  if (entries.length === 0) return null;

  return (
    <section
      aria-labelledby="pending-meals-title"
      className="rounded-lg border border-dashed bg-card p-3 shadow-soft"
    >
      <h2
        id="pending-meals-title"
        className="flex items-center gap-2 font-display text-lg font-extrabold"
      >
        <CloudOff size={18} strokeWidth={2} aria-hidden />
        {t.pendingTitle}
      </h2>
      <p className="text-xs text-ink-50">{t.pendingHint}</p>
      <ul className="mt-2 flex flex-col gap-2">
        {entries.map((entry) => {
          const label = describe(entry.meal);
          return (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-2 rounded-[10px] border p-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t.meals[entry.meal.meal]}</p>
                <p className="truncate text-ink-70">{label}</p>
              </div>
              <button
                type="button"
                onClick={() => removeQueuedMeal(entry.id)}
                aria-label={`${t.pendingRemove} : ${label}`}
                className="rounded-full p-1.5 text-ink-50 hover:bg-ink-10"
              >
                <Trash2 size={16} strokeWidth={2} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
