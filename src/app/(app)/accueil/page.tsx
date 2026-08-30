import {
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Flame,
  MoveDownRight,
  MoveUpRight,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { KemiaAvatar } from "@/components/illustrations/kemia-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MacroRing } from "@/components/ui/macro-ring";
import { Progress } from "@/components/ui/progress";
import { fr } from "@/i18n/fr";
import { evaluateGamification } from "@/lib/gamification/evaluate";
import {
  getCalendarDays,
  loadCalendarSettings,
} from "@/lib/jewish-calendar/cache";
import type { KashrutClass } from "@/lib/kashrut/meal";
import { computeTrend, weeklyTrendChange } from "@/lib/nutrition/ewma";
import type { Totals } from "@/lib/nutrition/items";
import { addDays, toDateString, weekStartOf } from "@/lib/planning/week";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const t = fr.accueil;

const MEAL_ORDER = [
  "petit_dej",
  "dej",
  "collation",
  "diner",
  "chabbat_vendredi",
  "chabbat_samedi",
] as const;

const KASHRUT_DOT: Record<KashrutClass, string> = {
  halavi: "bg-halavi",
  bassari: "bg-bassari",
  parve: "bg-parve",
};

function formatDateFr(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatDayFr(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

export default async function AccueilPage() {
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
  if (!user) redirect("/login");

  const today = toDateString(new Date());
  const weekStart = weekStartOf(today);

  const [
    profileRes,
    logsRes,
    goalRes,
    weightsRes,
    weekSessionsRes,
    planRes,
    summary,
    userCalendar,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("food_logs")
      .select("meal, totals, kashrut_class")
      .eq("user_id", user.id)
      .eq("date", today),
    supabase
      .from("goals")
      .select("calorie_target, protein_target_g, tdee_estimate")
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("weight_logs")
      .select("date, weight_kg")
      .eq("user_id", user.id)
      .gte("date", addDays(today, -120))
      .order("date"),
    supabase
      .from("workout_sessions")
      .select("label, kcal_est, date")
      .eq("user_id", user.id)
      .gte("date", weekStart)
      .order("date", { ascending: false }),
    supabase
      .from("meal_plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .maybeSingle(),
    evaluateGamification(supabase, user.id),
    loadCalendarSettings(supabase, user.id),
  ]);

  // Tonight's planned dinner (regular or chabbat slot), if a plan exists.
  let plannedDinner: {
    title: string;
    kcal: number | null;
    kashrutClass: KashrutClass | null;
  } | null = null;
  if (planRes.data) {
    const { data: slot } = await supabase
      .from("meal_plan_slots")
      .select("title, kcal, kashrut_class, meal")
      .eq("plan_id", planRes.data.id)
      .eq("date", today)
      .in("meal", ["diner", "chabbat_vendredi"])
      .limit(1)
      .maybeSingle();
    if (slot) {
      plannedDinner = {
        title: slot.title,
        kcal: slot.kcal,
        kashrutClass: (slot.kashrut_class ?? null) as KashrutClass | null,
      };
    }
  }

  const calendarEnabled = userCalendar?.enabled ?? true;
  const calendarDays =
    userCalendar && calendarEnabled
      ? await getCalendarDays(supabase, user.id, today, addDays(today, 6))
      : [];
  const dayInfo = calendarDays.at(0) ?? null;
  const fastDay = dayInfo?.isFast ?? false;
  const nextErev =
    calendarDays.find((d) => d.isErev && d.candleTime !== null) ?? null;

  // Day totals from today's logs.
  const dayTotals: Totals = {};
  const mealsByType = new Map<string, { kcal: number; kashrut: string | null }>();
  for (const log of logsRes.data ?? []) {
    const totals = (log.totals ?? {}) as Totals;
    for (const [key, value] of Object.entries(totals)) {
      if (typeof value === "number") {
        dayTotals[key as keyof Totals] =
          (dayTotals[key as keyof Totals] ?? 0) + value;
      }
    }
    const existing = mealsByType.get(log.meal) ?? { kcal: 0, kashrut: null };
    mealsByType.set(log.meal, {
      kcal: existing.kcal + (typeof totals.kcal === "number" ? totals.kcal : 0),
      kashrut: log.kashrut_class ?? existing.kashrut,
    });
  }
  const loggedMeals = MEAL_ORDER.filter((meal) => mealsByType.has(meal));

  const goal = goalRes.data;
  const calorieTarget = fastDay ? null : (goal?.calorie_target ?? null);
  const kcalEaten = dayTotals.kcal ?? 0;
  const proteinEaten = dayTotals.protein_g ?? 0;
  const proteinTarget = goal?.protein_target_g ?? null;

  // Weight trend (EWMA) and weekly rate.
  const trendPoints = computeTrend(weightsRes.data ?? []);
  const lastTrend = trendPoints.at(-1) ?? null;
  const weeklyChange = weeklyTrendChange(trendPoints);

  const journalStreak = summary.streaks.journal;
  const weekSessions = weekSessionsRes.data ?? [];
  const weekSportKcal = weekSessions.reduce(
    (sum, s) => sum + (s.kcal_est ?? 0),
    0,
  );

  const firstName = profileRes.data?.display_name?.split(" ")[0] ?? null;
  const kemiaMessage =
    nextErev !== null && nextErev.candleTime !== null
      ? t.kemiaErev.replace("{time}", nextErev.candleTime)
      : t.kemiaDefault;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {t.greeting}
          {firstName ? ` ${firstName}` : ""}
        </h1>
        <p className="text-sm text-ink-50 first-letter:uppercase">
          {formatDateFr(today)}
          {calendarEnabled && dayInfo ? ` · ${dayInfo.hebrewDate}` : ""}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-3 py-4">
          <CardContent className="flex items-center gap-4 px-4">
            <MacroRing
              value={kcalEaten}
              max={
                calorieTarget ??
                (fastDay
                  ? Math.max(kcalEaten, 1)
                  : (goal?.tdee_estimate ?? Math.max(kcalEaten, 1)))
              }
              label={t.caloriesTile}
              size={84}
            />
            <div className="flex flex-col gap-1 text-sm">
              {calorieTarget ? (
                <p className="text-ink-70">
                  <span className="font-mono font-semibold">
                    {Math.round(kcalEaten)}
                  </span>{" "}
                  {t.caloriesOf} {calorieTarget} {t.caloriesUnit}
                </p>
              ) : (
                <p className="text-xs text-ink-50">
                  {fastDay ? t.fastNoTarget : t.noTarget}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardContent className="flex flex-col justify-center gap-2 px-5">
            <p className="text-xs font-semibold text-ink-50">{t.proteinTile}</p>
            <p className="text-xl">
              <span className="font-mono font-semibold">
                {Math.round(proteinEaten)}
              </span>
              {proteinTarget && (
                <span className="text-sm text-ink-50"> / {proteinTarget} g</span>
              )}
            </p>
            {proteinTarget && (
              <Progress
                value={Math.min(100, (proteinEaten / proteinTarget) * 100)}
              />
            )}
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardContent className="flex flex-col justify-center gap-2 px-5">
            <p className="text-xs font-semibold text-ink-50">{t.weightTile}</p>
            {lastTrend ? (
              <>
                <p className="flex items-baseline gap-2 text-xl">
                  <span className="font-mono font-semibold">
                    {lastTrend.trend_kg.toLocaleString("fr-FR")}
                  </span>
                  <span className="text-sm text-ink-50">kg</span>
                  {weeklyChange !== null && (
                    <Badge variant={weeklyChange <= 0 ? "ok" : "secondary"}>
                      {weeklyChange <= 0 ? (
                        <MoveDownRight aria-hidden />
                      ) : (
                        <MoveUpRight aria-hidden />
                      )}
                      {weeklyChange.toLocaleString("fr-FR")} {t.weightPerWeek}
                    </Badge>
                  )}
                </p>
                <Link
                  href="/progres"
                  className="text-xs font-semibold text-boutargue-deep"
                >
                  {t.weightCta}
                </Link>
              </>
            ) : (
              <p className="text-xs text-ink-50">{t.weightEmpty}</p>
            )}
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardContent className="flex flex-col justify-center gap-2 px-5">
            <p className="text-xs font-semibold text-ink-50">{t.streakTile}</p>
            <p className="flex items-baseline gap-2 text-xl">
              <span className="flex items-center gap-1 font-mono font-semibold">
                {journalStreak.current > 0 && (
                  <Flame
                    size={18}
                    strokeWidth={2}
                    className="text-boutargue-deep"
                    aria-hidden
                  />
                )}
                {journalStreak.current}
              </span>
              <span className="text-sm text-ink-50">{t.streakDays}</span>
            </p>
            <p className="text-xs text-ink-50">
              {t.streakBest} {journalStreak.best} · {t.streakTolerance}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          <Card className="gap-4">
            <CardHeader className="items-center">
              <CardTitle>{t.plateTitle}</CardTitle>
              <Link
                href="/journal"
                className="col-start-2 row-start-1 flex items-center gap-0.5 justify-self-end text-sm font-semibold text-boutargue-deep"
              >
                {t.plateOpenJournal}
                <ChevronRight size={16} strokeWidth={2} aria-hidden />
              </Link>
            </CardHeader>
            <CardContent className="flex flex-col">
              {loggedMeals.length === 0 && (
                <p className="py-2 text-sm text-ink-50">{t.plateEmpty}</p>
              )}
              {loggedMeals.map((meal, index) => {
                const info = mealsByType.get(meal)!;
                return (
                  <div
                    key={meal}
                    className={`flex items-center gap-3 py-2.5 ${
                      index > 0 ? "border-t border-line-soft" : ""
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`size-2 rounded-full ${
                        info.kashrut
                          ? KASHRUT_DOT[info.kashrut as KashrutClass]
                          : "bg-ink-30"
                      }`}
                    />
                    <span className="text-sm font-semibold">
                      {fr.journal.meals[meal]}
                    </span>
                    <span className="ml-auto font-mono text-sm text-ink-70">
                      {Math.round(info.kcal)} kcal
                    </span>
                  </div>
                );
              })}
              {plannedDinner && !mealsByType.has("diner") && (
                <div
                  className={`flex flex-wrap items-center gap-3 py-2.5 ${
                    loggedMeals.length > 0 ? "border-t border-line-soft" : ""
                  }`}
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full bg-ink-10 ring-1 ring-ink-30"
                  />
                  <span className="text-sm text-ink-70">
                    {t.plannedLabel}{" "}
                    <span className="font-semibold text-ink">
                      {plannedDinner.title}
                    </span>
                    {plannedDinner.kcal ? ` · ${plannedDinner.kcal} kcal` : ""}
                  </span>
                  <Link
                    href="/planning"
                    className="ml-auto text-xs font-semibold text-boutargue-deep"
                  >
                    {t.planningCta}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-4">
            <CardHeader className="items-center">
              <CardTitle className="flex items-center gap-2">
                <Dumbbell size={18} strokeWidth={2} aria-hidden />
                {t.sportTitle}
              </CardTitle>
              <Link
                href="/sport"
                className="col-start-2 row-start-1 flex items-center gap-0.5 justify-self-end text-sm font-semibold text-boutargue-deep"
              >
                {t.sportCta}
                <ChevronRight size={16} strokeWidth={2} aria-hidden />
              </Link>
            </CardHeader>
            <CardContent>
              {weekSessions.length > 0 ? (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-xl">
                    <span className="font-mono font-semibold">
                      {weekSessions.length}
                    </span>{" "}
                    <span className="text-sm text-ink-50">
                      {weekSessions.length > 1 ? t.sportSessions : t.sportSession}{" "}
                      {t.sportThisWeek}
                    </span>
                  </p>
                  {weekSportKcal > 0 && (
                    <p className="text-sm text-ink-50">
                      <span className="font-mono font-semibold text-ink-70">
                        {Math.round(weekSportKcal)}
                      </span>{" "}
                      {t.sportKcalNote}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-ink-50">{t.sportEmpty}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="gap-4">
            <CardHeader className="items-center">
              <div className="flex items-center gap-2.5">
                <KemiaAvatar expression="sourire" size={36} />
                <div className="leading-tight">
                  <CardTitle>{fr.nav.coach}</CardTitle>
                  <p className="text-xs text-ink-50">{fr.nav.coachSubtitle}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="rounded-[10px] border border-line-soft bg-background p-3 text-sm leading-relaxed text-ink-70">
                {kemiaMessage}
              </p>
              <Button asChild variant="secondary" className="self-start">
                <Link href="/coach">{t.kemiaCta}</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="gap-3">
            <CardHeader className="items-center">
              <CardTitle>{t.planningTonight}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {plannedDinner ? (
                <div className="flex items-center gap-2.5">
                  {plannedDinner.kashrutClass && (
                    <span
                      aria-hidden
                      className={`size-2 rounded-full ${KASHRUT_DOT[plannedDinner.kashrutClass]}`}
                    />
                  )}
                  <span className="text-sm font-semibold">
                    {plannedDinner.title}
                  </span>
                  {plannedDinner.kcal !== null && (
                    <span className="ml-auto font-mono text-sm text-ink-50">
                      {plannedDinner.kcal} kcal
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-ink-50">{t.planningEmpty}</p>
              )}
              <Link
                href="/planning"
                className="text-xs font-semibold text-boutargue-deep"
              >
                {t.planningCta}
              </Link>
            </CardContent>
          </Card>

          {calendarEnabled && nextErev && nextErev.candleTime && (
            <Card className="gap-3">
              <CardHeader className="items-center">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays size={18} strokeWidth={2} aria-hidden />
                  {t.candleTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                <p className="text-sm font-semibold first-letter:uppercase">
                  {t.candleInfo
                    .replace("{day}", formatDayFr(nextErev.date))
                    .replace("{time}", nextErev.candleTime)}
                </p>
                <p className="text-xs text-ink-50">{t.candleNote}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
