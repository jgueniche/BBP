import {
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Dumbbell,
  History,
  Scale,
  Timer,
  Wheat,
} from "lucide-react";
import Link from "next/link";
import { z } from "zod";

import { isAiConfigured } from "@/ai/agents/food-logger";
import { LogComposer } from "@/components/journal/log-composer";
import { MealList, type MealLogView } from "@/components/journal/meal-list";
import { PendingMeals } from "@/components/journal/pending-meals";
import { KemiaAvatar } from "@/components/illustrations/kemia-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { MacroRing } from "@/components/ui/macro-ring";
import { fr } from "@/i18n/fr";
import {
  getCalendarDays,
  loadCalendarSettings,
} from "@/lib/jewish-calendar/cache";
import { activePostFeast } from "@/lib/jewish-calendar/engine";
import { resolveLocation } from "@/lib/jewish-calendar/locations";
import { isQuietTime } from "@/lib/jewish-calendar/quiet";
import { meatWaitStatus, type KashrutClass } from "@/lib/kashrut/meal";
import { foodLogItemSchema, type Totals } from "@/lib/nutrition/items";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import type { MealType } from "./actions";
import { DayGuard } from "./day-guard";

const t = fr.journal;

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

  // The day boundary follows the profile city's timezone (Tel Aviv rolls at
  // its own midnight, not at Paris's).
  const userCalendar = user
    ? await loadCalendarSettings(supabase, user.id)
    : null;
  const timeZone = resolveLocation(
    userCalendar?.settings.city ?? null,
  ).location.getTzid();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone }).format(
    new Date(),
  );
  const pinned = Boolean(d && /^\d{4}-\d{2}-\d{2}$/.test(d));
  const date = pinned ? d! : today;

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
      .select("meat_to_dairy_wait_hours, mode, kashrut_enabled, kitniyot")
      .maybeSingle(),
    supabase.from("food_favorites").select("label").order("created_at"),
  ]);

  // Jewish-calendar overlay for the displayed day (session 13): fast banner,
  // Pessah hametz check, chabbat quiet notice, après-fêtes mode and presets.
  const calendarEnabled = userCalendar?.enabled ?? true;
  let dayInfo = null;
  let postFeast = false;
  if (user && userCalendar && calendarEnabled) {
    const windowDays = await getCalendarDays(
      supabase,
      user.id,
      shiftDate(date, -10),
      date,
    );
    dayInfo = windowDays.at(-1) ?? null;
    postFeast = activePostFeast(windowDays, date) !== null;
  }
  const quietNow =
    date === today && userCalendar && calendarEnabled
      ? isQuietTime(new Date(), userCalendar.settings)
      : false;

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

  // Fast day (Kippour, Ticha BeAv, minor fasts opted in): no calorie target.
  const fastDay = dayInfo?.isFast ?? false;
  const calorieTarget = fastDay ? null : (goal?.calorie_target ?? null);

  // Pessah: flag logged hametz (and kitniyot for non-kitniyot profiles).
  const pessahDay =
    (settings?.kashrut_enabled ?? true) && (dayInfo?.isPessah ?? false);
  let hametzNames: string[] = [];
  let kitniyotNames: string[] = [];
  if (pessahDay) {
    const foodIds = [
      ...new Set(
        logs
          .flatMap((log) => log.items)
          .map((item) => item.food_id)
          .filter((id): id is string => id !== null),
      ),
    ];
    if (foodIds.length > 0) {
      const { data: flaggedFoods } = await supabase
        .from("foods")
        .select("id, name_fr, hametz, kitniyot")
        .in("id", foodIds);
      hametzNames = (flaggedFoods ?? [])
        .filter((f) => f.hametz)
        .map((f) => f.name_fr);
      if (settings?.kitniyot === false) {
        kitniyotNames = (flaggedFoods ?? [])
          .filter((f) => f.kitniyot && !f.hametz)
          .map((f) => f.name_fr);
      }
    }
  }

  // Chabbat/fête presets in the composer chips (Friday, Saturday, chag).
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const showChabbatPresets =
    calendarEnabled &&
    (weekday === 5 || weekday === 6 || (dayInfo?.isChag ?? false));

  let meatBanner: string | null = null;
  if (date === today && user && (settings?.kashrut_enabled ?? true)) {
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
      <DayGuard serverDate={date} pinned={pinned} timeZone={timeZone} />
      <header className="flex items-center gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {t.title}
        </h1>
        <Link
          href="/journal/historique"
          className="flex items-center gap-1.5 rounded-full border border-input bg-card px-3 py-1.5 text-xs font-semibold text-ink-70"
        >
          <History size={14} strokeWidth={2} aria-hidden />
          {t.history.link}
        </Link>
        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          <Link
            href={`/journal?d=${shiftDate(date, -1)}`}
            aria-label={fr.a11y.prevDay}
            className="rounded-full border border-input bg-card p-2"
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </Link>
          <p className="text-sm font-semibold text-ink-70 first-letter:uppercase">
            {formatDateFr(date)}
          </p>
          {date < today ? (
            <Link
              href={`/journal?d=${shiftDate(date, 1)}`}
              aria-label={fr.a11y.nextDay}
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

      {quietNow && (
        <p className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm font-medium shadow-soft">
          <CalendarHeart size={18} strokeWidth={2} aria-hidden />
          {t.quietBanner}
          {dayInfo?.havdalahTime && (
            <span className="text-ink-50">
              {t.quietHavdalah} {dayInfo.havdalahTime}.
            </span>
          )}
        </p>
      )}

      {postFeast && !fastDay && (
        <p className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm shadow-soft">
          <CalendarHeart size={18} strokeWidth={2} aria-hidden />
          {t.postFeastBanner}
        </p>
      )}

      {fastDay && (
        <div className="flex items-start gap-2 rounded-lg border bg-card p-3 text-sm shadow-soft">
          <Droplets
            size={18}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
            aria-hidden
          />
          <p>
            <span className="font-bold">
              {dayInfo?.fastName ?? t.fastBanner}.
            </span>{" "}
            {t.fastAdvice}
          </p>
        </div>
      )}

      {pessahDay && (
        <div className="flex items-start gap-2 rounded-lg border bg-card p-3 text-sm shadow-soft">
          <Wheat
            size={18}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
            aria-hidden
          />
          <div>
            <p className="font-bold">{t.pessahBanner}</p>
            {hametzNames.length > 0 ? (
              <p className="text-warn">
                {t.pessahHametz} {hametzNames.join(", ")}.
              </p>
            ) : (
              <p className="text-ink-70">{t.pessahClean}</p>
            )}
            {kitniyotNames.length > 0 && (
              <p className="text-ink-70">
                {t.pessahKitniyot} {kitniyotNames.join(", ")}.
              </p>
            )}
            <p className="text-xs text-ink-50">{t.pessahOffNote}</p>
          </div>
        </div>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          <LogComposer
            date={date}
            favorites={[
              ...(showChabbatPresets ? t.chabbatPresets : []),
              ...(favoritesRes.data ?? []).map((f) => f.label),
            ]}
            aiEnabled={isAiConfigured()}
          />

          <PendingMeals date={date} />

          {logs.length === 0 ? (
            <EmptyState
              illustration={<KemiaAvatar expression="douce" size={64} />}
              title={t.empty}
              hint={t.dayEmptyHint}
            />
          ) : (
            <MealList logs={logs} />
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-lg border bg-card p-4 shadow-soft">
            <p className="text-xs font-semibold text-ink-50">{t.daySummary}</p>
            <div className="mt-3 flex items-center justify-center gap-6">
              {calorieTarget ? (
                <MacroRing
                  value={dayTotals.kcal ?? 0}
                  max={calorieTarget}
                  label={t.totalsKcal}
                />
              ) : (
                <MacroRing
                  value={dayTotals.kcal ?? 0}
                  max={
                    fastDay
                      ? Math.max(dayTotals.kcal ?? 0, 1)
                      : (goal?.tdee_estimate ??
                        Math.max(dayTotals.kcal ?? 0, 1))
                  }
                  label={t.totalsKcal}
                />
              )}
              <MacroRing
                value={dayTotals.protein_g ?? 0}
                max={
                  goal?.protein_target_g ??
                  Math.max(dayTotals.protein_g ?? 0, 1)
                }
                label={t.protein}
                unit="g"
              />
            </div>
            {!calorieTarget && !fastDay && (
              <p className="mt-2 text-center text-xs text-ink-50">
                {t.noTargets}
              </p>
            )}
          </div>

          {meatBanner && (
            <p className="flex items-center gap-2 rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm font-medium shadow-soft">
              <Timer size={18} strokeWidth={2} aria-hidden />
              {t.meatTimer} : {meatBanner}
            </p>
          )}

          <div className="flex items-center gap-4 rounded-lg border bg-card p-3 shadow-soft">
            <Link
              href="/progres"
              className="flex items-center gap-1.5 text-sm font-semibold text-boutargue-deep"
            >
              <Scale size={16} strokeWidth={2} aria-hidden />
              {fr.poids.linkFromJournal}
            </Link>
            <Link
              href="/sport"
              className="flex items-center gap-1.5 text-sm font-semibold text-boutargue-deep"
            >
              <Dumbbell size={16} strokeWidth={2} aria-hidden />
              {fr.sport.title}
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
