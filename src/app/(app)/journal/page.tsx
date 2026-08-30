import { ChevronLeft, ChevronRight, Scale, Timer } from "lucide-react";
import Link from "next/link";
import { z } from "zod";

import { isAiConfigured } from "@/ai/agents/food-logger";
import { LogComposer } from "@/components/journal/log-composer";
import { MealList, type MealLogView } from "@/components/journal/meal-list";
import { KemiaAvatar } from "@/components/illustrations/kemia-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { MacroRing } from "@/components/ui/macro-ring";
import { fr } from "@/i18n/fr";
import { meatWaitStatus, type KashrutClass } from "@/lib/kashrut/meal";
import { foodLogItemSchema, type Totals } from "@/lib/nutrition/items";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import type { MealType } from "./actions";

const t = fr.journal;

function parisToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
  }).format(new Date());
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateFr(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${m.toString().padStart(2, "0")}`;
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  const today = parisToday();
  const date = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today;

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [logsRes, goalRes, settingsRes, favoritesRes] = await Promise.all([
    supabase
      .from("food_logs")
      .select("id, meal, items, totals, kashrut_class, logged_at")
      .eq("date", date)
      .order("logged_at", { ascending: true }),
    supabase
      .from("goals")
      .select("calorie_target, protein_target_g, tdee_estimate, type")
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("user_settings")
      .select("meat_to_dairy_wait_hours, mode")
      .maybeSingle(),
    supabase.from("food_favorites").select("label").order("created_at"),
  ]);

  const itemsSchema = z.array(foodLogItemSchema);
  const logs: MealLogView[] = (logsRes.data ?? []).map((log) => ({
    id: log.id,
    meal: log.meal as MealType,
    items: itemsSchema.catch([]).parse(log.items),
    totals: (log.totals ?? {}) as Totals,
    kashrut_class: (log.kashrut_class ?? null) as KashrutClass | null,
  }));

  const dayTotals: Totals = {};
  for (const log of logs) {
    for (const [key, value] of Object.entries(log.totals)) {
      if (typeof value === "number") {
        dayTotals[key as keyof Totals] =
          (dayTotals[key as keyof Totals] ?? 0) + value;
      }
    }
  }

  const goal = goalRes.data;
  const settings = settingsRes.data;

  let meatBanner: string | null = null;
  if (date === today && user) {
    const { data: lastBassari } = await supabase
      .from("food_logs")
      .select("logged_at")
      .eq("kashrut_class", "bassari")
      .gte("logged_at", new Date(Date.now() - 12 * 3_600_000).toISOString())
      .order("logged_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastBassari) {
      const status = meatWaitStatus(
        new Date(lastBassari.logged_at),
        settings?.meat_to_dairy_wait_hours ?? 6,
      );
      if (status.active) {
        meatBanner = t.meatTimerActive.replace(
          "{time}",
          formatMinutes(status.remainingMinutes),
        );
      }
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <Link
          href={`/journal?d=${shiftDate(date, -1)}`}
          aria-label="Jour précédent"
          className="rounded-full border-2 border-ink p-2"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </Link>
        <h1 className="font-display text-xl font-extrabold tracking-tight first-letter:uppercase">
          {formatDateFr(date)}
        </h1>
        {date < today ? (
          <Link
            href={`/journal?d=${shiftDate(date, 1)}`}
            aria-label="Jour suivant"
            className="rounded-full border-2 border-ink p-2"
          >
            <ChevronRight size={20} strokeWidth={2} />
          </Link>
        ) : (
          <span className="p-2" aria-hidden>
            <ChevronRight size={20} strokeWidth={2} className="opacity-20" />
          </span>
        )}
      </header>

      <div className="flex items-center justify-center gap-6">
        {goal?.calorie_target ? (
          <MacroRing
            value={dayTotals.kcal ?? 0}
            max={goal.calorie_target}
            label={t.totalsKcal}
          />
        ) : (
          <MacroRing
            value={dayTotals.kcal ?? 0}
            max={goal?.tdee_estimate ?? Math.max(dayTotals.kcal ?? 0, 1)}
            label={t.totalsKcal}
          />
        )}
        <MacroRing
          value={dayTotals.protein_g ?? 0}
          max={goal?.protein_target_g ?? Math.max(dayTotals.protein_g ?? 0, 1)}
          label={t.protein}
          unit="g"
        />
      </div>
      {!goal?.calorie_target && (
        <p className="text-center text-xs text-ink-50">{t.noTargets}</p>
      )}

      <Link
        href="/poids"
        className="mx-auto flex items-center gap-1.5 text-sm font-medium text-ink-70 underline underline-offset-4"
      >
        <Scale size={16} strokeWidth={2} aria-hidden />
        {fr.poids.linkFromJournal}
      </Link>

      {meatBanner && (
        <p className="flex items-center gap-2 rounded-[16px] border-2 border-ink bg-boutargue-soft p-3 text-sm font-medium text-[#0b0b0b]">
          <Timer size={18} strokeWidth={2} aria-hidden />
          {t.meatTimer} : {meatBanner}
        </p>
      )}

      <LogComposer
        date={date}
        favorites={(favoritesRes.data ?? []).map((f) => f.label)}
        aiEnabled={isAiConfigured()}
      />

      {logs.length === 0 ? (
        <EmptyState
          illustration={<KemiaAvatar expression="douce" size={64} />}
          title={t.empty}
          hint={t.dayEmptyHint}
        />
      ) : (
        <MealList logs={logs} />
      )}
    </section>
  );
}
