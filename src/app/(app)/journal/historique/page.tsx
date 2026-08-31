import { ChevronLeft, ChevronRight, History } from "lucide-react";
import Link from "next/link";

import { fr } from "@/i18n/fr";
import { loadCalendarSettings } from "@/lib/jewish-calendar/cache";
import { resolveLocation } from "@/lib/jewish-calendar/locations";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const t = fr.journal.history;

type DayAggregate = {
  date: string;
  kcal: number;
  proteinG: number;
  meals: number;
};

function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
}

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, "0")}`;
}

function lastDayOf(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${month}-${last.toString().padStart(2, "0")}`;
}

function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export default async function HistoriquePage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const { mois } = await searchParams;

  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const userCalendar = await loadCalendarSettings(supabase, user.id);
  const timeZone = resolveLocation(
    userCalendar.settings.city,
  ).location.getTzid();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone }).format(
    new Date(),
  );
  const currentMonth = today.slice(0, 7);
  const month =
    mois && /^\d{4}-\d{2}$/.test(mois) && mois <= currentMonth
      ? mois
      : currentMonth;

  const [{ data: logs }, { data: goal }] = await Promise.all([
    supabase
      .from("food_logs")
      .select("date, totals")
      .eq("user_id", user.id)
      .gte("date", `${month}-01`)
      .lte("date", lastDayOf(month))
      .order("date"),
    supabase
      .from("goals")
      .select("calorie_target, protein_target_g")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  const byDate = new Map<string, DayAggregate>();
  for (const log of logs ?? []) {
    const totals = (log.totals ?? {}) as { kcal?: number; protein_g?: number };
    const entry = byDate.get(log.date) ?? {
      date: log.date,
      kcal: 0,
      proteinG: 0,
      meals: 0,
    };
    entry.kcal += typeof totals.kcal === "number" ? totals.kcal : 0;
    entry.proteinG +=
      typeof totals.protein_g === "number" ? totals.protein_g : 0;
    entry.meals += 1;
    byDate.set(log.date, entry);
  }
  const days = [...byDate.values()]
    .filter((day) => day.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date));

  const journaledDays = days.length;
  const avgKcal =
    journaledDays > 0
      ? Math.round(days.reduce((sum, d) => sum + d.kcal, 0) / journaledDays)
      : null;
  const avgProtein =
    journaledDays > 0
      ? Math.round(days.reduce((sum, d) => sum + d.proteinG, 0) / journaledDays)
      : null;

  const calorieTarget = goal?.calorie_target ?? null;
  const nextMonth = shiftMonth(month, 1);

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          <History size={26} strokeWidth={2} aria-hidden />
          {t.title}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/journal/historique?mois=${shiftMonth(month, -1)}`}
            aria-label={t.prevMonth}
            className="rounded-full border border-input bg-card p-2"
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </Link>
          <p className="text-sm font-semibold text-ink-70 first-letter:uppercase">
            {monthLabel(month)}
          </p>
          {nextMonth <= currentMonth ? (
            <Link
              href={`/journal/historique?mois=${nextMonth}`}
              aria-label={t.nextMonth}
              className="rounded-full border border-input bg-card p-2"
            >
              <ChevronRight size={18} strokeWidth={2} />
            </Link>
          ) : (
            <span className="p-2" aria-hidden>
              <ChevronRight size={18} strokeWidth={2} className="opacity-20" />
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center shadow-soft">
          <p className="font-mono text-2xl font-bold">{journaledDays}</p>
          <p className="text-xs text-ink-50">{t.journaledDays}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center shadow-soft">
          <p className="font-mono text-2xl font-bold">{avgKcal ?? "—"}</p>
          <p className="text-xs text-ink-50">
            {t.avgKcal}
            {calorieTarget !== null && avgKcal !== null && (
              <span className="block">
                {t.target} {calorieTarget}
              </span>
            )}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center shadow-soft">
          <p className="font-mono text-2xl font-bold">{avgProtein ?? "—"}</p>
          <p className="text-xs text-ink-50">
            {t.avgProtein}
            {goal?.protein_target_g != null && avgProtein !== null && (
              <span className="block">
                {t.target} {goal.protein_target_g} g
              </span>
            )}
          </p>
        </div>
      </div>

      {days.length === 0 ? (
        <p className="rounded-lg border bg-card p-4 text-sm text-ink-70 shadow-soft">
          {t.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {days.map((day) => {
            const ratio =
              calorieTarget !== null && calorieTarget > 0
                ? Math.min(day.kcal / calorieTarget, 1.25) / 1.25
                : null;
            return (
              <li key={day.date}>
                <Link
                  href={`/journal?d=${day.date}`}
                  className="block rounded-lg border bg-card p-3 shadow-soft transition-colors hover:border-boutargue"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold first-letter:uppercase">
                      {dayLabel(day.date)}
                    </p>
                    <p className="font-mono text-sm">
                      <span className="font-bold">{Math.round(day.kcal)}</span>{" "}
                      <span className="text-ink-50">kcal</span>
                      <span className="ml-2 text-ink-50">
                        {Math.round(day.proteinG)} g prot.
                      </span>
                    </p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    {ratio !== null && (
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-10"
                        aria-hidden
                      >
                        <div
                          className="h-full rounded-full bg-boutargue-deep"
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                    )}
                    <p className="shrink-0 text-[11px] text-ink-50">
                      {day.meals}{" "}
                      {day.meals > 1 ? t.mealsPlural : t.mealSingular}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
