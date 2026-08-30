import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";
import {
  computeCalendarDays,
  feastEnds,
  type CalendarDay,
  type CalendarSettings,
} from "@/lib/jewish-calendar/engine";
import { computeTrend } from "@/lib/nutrition/ewma";
import { addDays, toDateString } from "@/lib/planning/week";

import { earnedBadgeSlugs, type BadgeContext } from "./badges";
import { computeXp, levelForXp, type GamificationStats } from "./levels";
import { computeStreakFrom, type StreakResult } from "./streaks";

type Supabase = SupabaseClient<Database>;

const HORIZON_DAYS = 400;
const XP_PER_BADGE = 50;

/** Saturdays + yom tov over the horizon — the streak-tolerant days. */
function exemptDates(days: CalendarDay[]): Set<string> {
  const exempt = new Set<string>();
  for (const day of days) {
    if (new Date(`${day.date}T00:00:00Z`).getUTCDay() === 6 || day.isChag) {
      exempt.add(day.date);
    }
  }
  return exempt;
}

export type GamificationSummary = {
  stats: GamificationStats;
  streaks: Record<"journal" | "sport" | "pesee", StreakResult>;
  xp: number;
  level: ReturnType<typeof levelForXp>;
  earned: string[];
  newBadges: string[];
};

export async function evaluateGamification(
  supabase: Supabase,
  userId: string,
): Promise<GamificationSummary> {
  const today = toDateString(new Date());
  const since = addDays(today, -HORIZON_DAYS);

  const [
    { data: settings },
    { data: profile },
    { data: foodLogs },
    { data: weights },
    { data: sessions },
    { data: myRecipes },
    { data: myPosts },
    { data: planSlots },
    { data: existingBadges },
  ] = await Promise.all([
    supabase
      .from("user_settings")
      .select("israel_calendar, meat_to_dairy_wait_hours, mode")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("profiles").select("city").eq("id", userId).maybeSingle(),
    supabase
      .from("food_logs")
      .select("date, logged_at, kashrut_class, items")
      .eq("user_id", userId)
      .gte("date", since),
    supabase
      .from("weight_logs")
      .select("date, weight_kg")
      .eq("user_id", userId)
      .gte("date", since)
      .order("date"),
    supabase
      .from("workout_sessions")
      .select("date, kind, label, duration_min")
      .eq("user_id", userId)
      .gte("date", since),
    supabase
      .from("recipes")
      .select("id, visibility, status, source_url, version_kind")
      .eq("author_id", userId),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: false })
      .eq("author_id", userId)
      .limit(1000),
    supabase.from("meal_plan_slots").select("date, meal, tags").limit(500),
    supabase.from("user_badges").select("badge_slug").eq("user_id", userId),
  ]);

  const journalDates = [...new Set((foodLogs ?? []).map((l) => l.date))];
  const weighDates = [...new Set((weights ?? []).map((w) => w.date))];
  const sportDates = [...new Set((sessions ?? []).map((s) => s.date))];

  const walkKm = (sessions ?? [])
    .filter((s) => s.kind === "activity" && /marche|rando/i.test(s.label ?? ""))
    .reduce((km, s) => km + ((s.duration_min ?? 0) / 60) * 5, 0);

  const published = (myRecipes ?? []).filter(
    (r) => r.visibility === "community" && r.status === "published",
  );

  // Max bsahtek on my recipes (RLS-visible through the stats view).
  let maxRecipeLikes = 0;
  const myRecipeIds = (myRecipes ?? []).map((r) => r.id);
  if (myRecipeIds.length > 0) {
    const { data: likeStats } = await supabase
      .from("recipe_social_stats")
      .select("likes")
      .in("recipe_id", myRecipeIds);
    maxRecipeLikes = Math.max(0, ...(likeStats ?? []).map((s) => s.likes));
  }

  // A recipe of mine living in a carnet that has invited members.
  let familyShared = false;
  if (myRecipeIds.length > 0) {
    const { data: links } = await supabase
      .from("collection_recipes")
      .select("collection_id, recipe_id")
      .in("recipe_id", myRecipeIds);
    const collectionIds = [
      ...new Set((links ?? []).map((l) => l.collection_id)),
    ];
    if (collectionIds.length > 0) {
      const { count } = await supabase
        .from("collection_members")
        .select("user_id", { count: "exact", head: true })
        .in("collection_id", collectionIds);
      familyShared = (count ?? 0) > 0;
    }
  }

  const hasShabbatPlan = (planSlots ?? []).some(
    (slot) =>
      slot.tags.includes("chabbat") ||
      (slot.meal === "diner" &&
        new Date(`${slot.date}T00:00:00Z`).getUTCDay() === 5),
  );

  // Days where a meat meal was respected: no dairy logged before the wait.
  const waitHours = settings?.meat_to_dairy_wait_hours ?? 6;
  const byDate = new Map<string, Array<{ at: number; k: string | null }>>();
  for (const log of foodLogs ?? []) {
    const list = byDate.get(log.date) ?? [];
    list.push({ at: new Date(log.logged_at).getTime(), k: log.kashrut_class });
    byDate.set(log.date, list);
  }
  let meatWaitDays = 0;
  for (const [, logs] of byDate) {
    const meats = logs.filter((l) => l.k === "bassari");
    if (meats.length === 0) continue;
    const violated = logs.some(
      (l) =>
        l.k === "halavi" &&
        meats.some((m) => l.at > m.at && l.at - m.at < waitHours * 3_600_000),
    );
    if (!violated) meatWaitDays += 1;
  }

  const trend = computeTrend(weights ?? []);
  const firstTrend = trend[0]?.trend_kg ?? null;
  const lastTrend = trend.at(-1)?.trend_kg ?? null;
  const weightTrendDropPct =
    firstTrend !== null && lastTrend !== null && firstTrend > 0
      ? ((firstTrend - lastTrend) / firstTrend) * 100
      : 0;

  // Calendar-bound stats (session 13): one engine pass over the horizon.
  const calSettings: CalendarSettings = {
    city: profile?.city ?? null,
    israelCalendar: settings?.israel_calendar ?? false,
    minorFasts: false,
    candleOffsetMin: 18,
  };
  const horizonDays = computeCalendarDays(since, HORIZON_DAYS + 1, calSettings);

  // Pessah sans hametz: journaled Pessah days with zero hametz foods logged.
  const pessahDates = new Set(
    horizonDays.filter((d) => d.isPessah).map((d) => d.date),
  );
  const foodIdsByPessahDate = new Map<string, string[]>();
  for (const log of foodLogs ?? []) {
    if (!pessahDates.has(log.date)) continue;
    const items = Array.isArray(log.items)
      ? (log.items as Array<{ food_id?: string | null }>)
      : [];
    const ids = items
      .map((item) => item.food_id)
      .filter((id): id is string => typeof id === "string");
    foodIdsByPessahDate.set(log.date, [
      ...(foodIdsByPessahDate.get(log.date) ?? []),
      ...ids,
    ]);
  }
  let pessahCleanDays = 0;
  if (foodIdsByPessahDate.size > 0) {
    const allIds = [...new Set([...foodIdsByPessahDate.values()].flat())];
    const { data: hametzRows } =
      allIds.length > 0
        ? await supabase
            .from("foods")
            .select("id")
            .in("id", allIds)
            .eq("hametz", true)
        : { data: [] };
    const hametzIds = new Set((hametzRows ?? []).map((f) => f.id));
    for (const [, ids] of foodIdsByPessahDate) {
      if (!ids.some((id) => hametzIds.has(id))) pessahCleanDays += 1;
    }
  }

  // Après-fêtes: a gentle-reset week completed after Tichri/Pessah/Hanouka —
  // at least 5 journaled days in the 7 days following a feast end.
  const journalSet = new Set(journalDates);
  const postFeastWeekDone = feastEnds(horizonDays).some((end) => {
    if (end.endedOn >= today) return false;
    let journaled = 0;
    for (let i = 1; i <= 7; i += 1) {
      if (journalSet.has(addDays(end.endedOn, i))) journaled += 1;
    }
    return journaled >= 5;
  });

  // Kif-kif: a stable month in Boutargue mode — trend moved ≤ 2% over ≥ 21
  // days within the last 30, with at least 4 weigh-ins.
  const monthAgo = addDays(today, -30);
  const monthTrend = trend.filter((p) => p.date >= monthAgo);
  const monthWeighs = weighDates.filter((d) => d >= monthAgo).length;
  const monthFirst = monthTrend[0];
  const monthLast = monthTrend.at(-1);
  const stableBoutargueMonth =
    settings?.mode === "boutargue" &&
    monthWeighs >= 4 &&
    monthFirst !== undefined &&
    monthLast !== undefined &&
    Date.parse(monthLast.date) - Date.parse(monthFirst.date) >=
      21 * 86_400_000 &&
    monthFirst.trend_kg > 0 &&
    Math.abs(monthLast.trend_kg - monthFirst.trend_kg) / monthFirst.trend_kg <=
      0.02;

  const stats: GamificationStats = {
    journalDates,
    weighDates,
    sportDates,
    sessionsCount: (sessions ?? []).length,
    walkKm,
    publishedRecipes: published.length,
    importedRecipes: (myRecipes ?? []).filter((r) => r.source_url !== null)
      .length,
    proteinRecipes: (myRecipes ?? []).filter(
      (r) => r.version_kind === "proteine",
    ).length,
    maxRecipeLikes,
    familyShared,
    hasShabbatPlan,
    meatWaitDays,
    pessahCleanDays,
    postFeastWeekDone,
    weightTrendDropPct,
    stableBoutargueMonth,
    postsCount: (myPosts ?? []).length,
  };

  const exempt = exemptDates(horizonDays);
  const streaks = {
    journal: computeStreakFrom(journalDates, exempt, today),
    sport: computeStreakFrom(sportDates, exempt, today),
    pesee: computeStreakFrom(weighDates, exempt, today),
  };

  const context: BadgeContext = { stats, journalStreak: streaks.journal };
  const earned = earnedBadgeSlugs(context);
  const alreadyEarned = new Set(
    (existingBadges ?? []).map((b) => b.badge_slug),
  );
  const newBadges = earned.filter((slug) => !alreadyEarned.has(slug));

  // Persist: streaks, new badges, XP/level, joined-challenge progress.
  await supabase.from("streaks").upsert(
    (Object.entries(streaks) as Array<[string, StreakResult]>).map(
      ([kind, value]) => ({
        user_id: userId,
        kind,
        current: value.current,
        best: value.best,
        last_date: today,
      }),
    ),
    { onConflict: "user_id,kind" },
  );
  if (newBadges.length > 0) {
    await supabase.from("user_badges").upsert(
      newBadges.map((slug) => ({ user_id: userId, badge_slug: slug })),
      { onConflict: "user_id,badge_slug" },
    );
  }

  const totalEarned = new Set([...alreadyEarned, ...earned]).size;
  const xp = computeXp(stats) + totalEarned * XP_PER_BADGE;
  const level = levelForXp(xp);
  await supabase
    .from("profiles")
    .update({ xp, level: level.level })
    .eq("id", userId);

  const { data: joined } = await supabase
    .from("challenge_participants")
    .select("challenge_slug")
    .eq("user_id", userId);
  const joinedSlugs = (joined ?? []).map((row) => row.challenge_slug);
  const { data: challengeRows } =
    joinedSlugs.length > 0
      ? await supabase
          .from("challenges")
          .select("slug, metric")
          .in("slug", joinedSlugs)
      : { data: [] };
  const metricBySlug = new Map(
    (challengeRows ?? []).map((c) => [c.slug, c.metric]),
  );
  for (const row of joined ?? []) {
    const metric = metricBySlug.get(row.challenge_slug);
    const progress =
      metric === "journal_days"
        ? journalDates.length
        : metric === "distance_km"
          ? Math.round(walkKm * 10) / 10
          : metric === "sessions"
            ? stats.sessionsCount
            : metric === "protein_recipes"
              ? stats.proteinRecipes
              : 0;
    await supabase
      .from("challenge_participants")
      .update({ progress })
      .eq("challenge_slug", row.challenge_slug)
      .eq("user_id", userId);
  }

  return { stats, streaks, xp, level, earned, newBadges };
}
