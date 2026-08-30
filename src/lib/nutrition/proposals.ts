import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";
import { computeAdaptiveTdee } from "@/lib/nutrition/adaptive";
import type { Gender, GoalType } from "@/lib/nutrition/tdee";

const WINDOW_DAYS = 28;

function mondayOfCurrentWeek(now = new Date()): string {
  const d = new Date(now);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

/**
 * Weekly adaptive-TDEE proposal (brief §4.4). Idempotent per (user, week):
 * the unique constraint makes concurrent calls safe. Used by the /poids page
 * on load and by the weekly cron route.
 */
export async function maybeGenerateTdeeProposal(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const weekStart = mondayOfCurrentWeek();

  const { data: existing } = await supabase
    .from("tdee_proposals")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (existing) return;

  const { data: goal } = await supabase
    .from("goals")
    .select("id, type, tdee_estimate, calorie_target, weekly_rate_pct")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!goal?.tdee_estimate) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("gender")
    .eq("id", userId)
    .maybeSingle();

  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [{ data: weights }, { data: logs }] = await Promise.all([
    supabase
      .from("weight_logs")
      .select("date, weight_kg")
      .eq("user_id", userId)
      .gte("date", since)
      .order("date"),
    supabase
      .from("food_logs")
      .select("date, totals")
      .eq("user_id", userId)
      .gte("date", since),
  ]);

  if (!weights || weights.length === 0) return;

  const kcalByDay = new Map<string, number>();
  for (const log of logs ?? []) {
    const kcal = (log.totals as { kcal?: number } | null)?.kcal;
    if (typeof kcal === "number") {
      kcalByDay.set(log.date, (kcalByDay.get(log.date) ?? 0) + kcal);
    }
  }

  const result = computeAdaptiveTdee({
    weights,
    dailyIntakes: Array.from(kcalByDay, ([date, kcal]) => ({ date, kcal })),
    currentTdee: goal.tdee_estimate,
    currentCalorieTarget: goal.calorie_target,
    goalType: goal.type as GoalType,
    weeklyRatePct: goal.weekly_rate_pct,
    gender: (profile?.gender ?? "autre") as Gender,
  });
  if (!result) return;

  // Skip noise: don't bother the user for a < 3% move with an unchanged target.
  const relativeMove =
    Math.abs(result.newTdee - goal.tdee_estimate) / goal.tdee_estimate;
  if (relativeMove < 0.03 && result.newCalorieTarget === goal.calorie_target) {
    return;
  }

  await supabase.from("tdee_proposals").insert({
    user_id: userId,
    week_start: weekStart,
    old_tdee: goal.tdee_estimate,
    new_tdee: result.newTdee,
    old_calorie_target: goal.calorie_target,
    new_calorie_target: result.newCalorieTarget,
    avg_intake_kcal: result.avgIntakeKcal,
    trend_change_kg: result.trendChangeKg,
    days_with_logs: result.daysWithLogs,
  });
}
