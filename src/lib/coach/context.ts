import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";
import { computeTrend, weeklyTrendChange } from "@/lib/nutrition/ewma";
import { ageFromBirthYear } from "@/lib/nutrition/tdee";

const MAX_MEMORIES = 40;

export type CoachContext = {
  userContext: string;
  memories: string;
  safeMode: boolean;
  displayName: string | null;
  gender: string | null;
  mode: string | null;
};

export async function buildCoachContext(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CoachContext> {
  const since = new Date(Date.now() - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [
    profileRes,
    settingsRes,
    healthRes,
    goalRes,
    weightsRes,
    logsRes,
    memoriesRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, gender, birth_year, height_cm, city")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("user_settings").select("*").maybeSingle(),
    supabase
      .from("health_profile")
      .select("medical_flags, allergies, dislikes, wellbeing_flag")
      .maybeSingle(),
    supabase
      .from("goals")
      .select(
        "type, calorie_target, protein_target_g, tdee_estimate, target_weight_kg, weekly_rate_pct",
      )
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("weight_logs")
      .select("date, weight_kg")
      .eq("user_id", userId)
      .gte(
        "date",
        new Date(Date.now() - 35 * 86_400_000).toISOString().slice(0, 10),
      )
      .order("date"),
    supabase
      .from("food_logs")
      .select("date, totals")
      .eq("user_id", userId)
      .gte("date", since),
    supabase
      .from("coach_memories")
      .select("content")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(MAX_MEMORIES),
  ]);

  const profile = profileRes.data;
  const settings = settingsRes.data;
  const health = healthRes.data;
  const goal = goalRes.data;

  const medicalFlags = (health?.medical_flags ?? {}) as Record<string, boolean>;
  const hasMedicalFlag = Object.values(medicalFlags).some(Boolean);
  const age = profile?.birth_year ? ageFromBirthYear(profile.birth_year) : null;
  const safeMode = Boolean(
    health?.wellbeing_flag || hasMedicalFlag || (age !== null && age < 18),
  );

  const kcalByDay = new Map<string, number>();
  let proteinTotal = 0;
  for (const log of logsRes.data ?? []) {
    const totals = (log.totals ?? {}) as { kcal?: number; protein_g?: number };
    if (typeof totals.kcal === "number") {
      kcalByDay.set(log.date, (kcalByDay.get(log.date) ?? 0) + totals.kcal);
    }
    if (typeof totals.protein_g === "number") proteinTotal += totals.protein_g;
  }
  const loggedDays = kcalByDay.size;
  const avgKcal =
    loggedDays > 0
      ? Math.round(
          [...kcalByDay.values()].reduce((a, b) => a + b, 0) / loggedDays,
        )
      : null;
  const avgProtein =
    loggedDays > 0 ? Math.round(proteinTotal / loggedDays) : null;

  const trend = computeTrend(weightsRes.data ?? []);
  const lastTrend = trend.at(-1) ?? null;
  const weekly = weeklyTrendChange(trend);

  const parts: string[] = [];
  if (profile?.display_name) parts.push(`Prénom : ${profile.display_name}.`);
  if (profile?.gender) parts.push(`Genre : ${profile.gender}.`);
  if (age !== null) parts.push(`Âge : ${age} ans.`);
  if (settings?.mode)
    parts.push(
      `Mode : ${settings.mode === "proteine" ? "Protéine (diète structurée)" : "Boutargue (équilibre plaisir)"}.`,
    );
  if (goal) {
    parts.push(
      `Objectif : ${goal.type}${goal.target_weight_kg ? `, cible ${goal.target_weight_kg} kg` : ""}${goal.weekly_rate_pct ? `, rythme ${goal.weekly_rate_pct} %/sem` : ""}. TDEE estimé ${goal.tdee_estimate ?? "?"} kcal${goal.calorie_target ? `, cible ${goal.calorie_target} kcal/j` : ", pas de cible chiffrée"}${goal.protein_target_g ? `, protéines ${goal.protein_target_g} g/j` : ""}.`,
    );
  }
  if (lastTrend)
    parts.push(
      `Poids tendance : ${lastTrend.trend_kg} kg${weekly !== null ? ` (${weekly > 0 ? "+" : ""}${weekly} kg/sem)` : ""}.`,
    );
  parts.push(
    loggedDays > 0
      ? `7 derniers jours : ${loggedDays} jours de journal, ~${avgKcal} kcal/j, ~${avgProtein} g de protéines/j.`
      : `7 derniers jours : journal vide.`,
  );
  if (settings) {
    const kashrut: string[] = [];
    if (settings.shomer_shabbat) kashrut.push("chomer chabbat");
    kashrut.push(`délai viande→lait ${settings.meat_to_dairy_wait_hours} h`);
    if (settings.no_fish_with_meat)
      kashrut.push("pas de poisson avec la viande");
    kashrut.push(
      settings.kitniyot ? "kitniyot OK à Pessah" : "pas de kitniyot",
    );
    if (settings.israel_calendar) kashrut.push("calendrier Israël");
    parts.push(`Cacherout : ${kashrut.join(", ")}.`);
  }
  if (health?.allergies?.length)
    parts.push(`Allergies : ${health.allergies.join(", ")}.`);
  if (health?.dislikes?.length)
    parts.push(`N'aime pas : ${health.dislikes.join(", ")}.`);

  const memories = (memoriesRes.data ?? [])
    .map((m) => `- ${m.content}`)
    .join("\n");

  return {
    userContext: parts.join(" "),
    memories,
    safeMode,
    displayName: profile?.display_name ?? null,
    gender: profile?.gender ?? null,
    mode: settings?.mode ?? null,
  };
}
