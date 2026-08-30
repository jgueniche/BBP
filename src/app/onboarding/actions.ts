"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  ageFromBirthYear,
  clampWeeklyRate,
  computeCalorieTarget,
  computeProteinTarget,
  computeTdee,
} from "@/lib/nutrition/tdee";
import { createClient } from "@/lib/supabase/server";

const onboardingSchema = z.object({
  displayName: z.string().min(1).max(40),
  gender: z.enum(["femme", "homme", "autre"]),
  birthYear: z.number().int().min(1900).max(2100),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(30).max(400),
  city: z.string().max(80).default(""),
  consent: z.literal(true),
  medicalFlags: z.object({
    pregnancy: z.boolean(),
    breastfeeding: z.boolean(),
    diabetes: z.boolean(),
    ed_history: z.boolean(),
    other: z.boolean(),
  }),
  goalType: z.enum(["perte", "maintien", "recomp"]),
  targetWeightKg: z.number().min(30).max(400).nullable(),
  weeklyRatePct: z.number().min(0.25).max(1).nullable(),
  activityLevel: z.enum([
    "sedentaire",
    "leger",
    "modere",
    "actif",
    "tres_actif",
  ]),
  mode: z.enum(["proteine", "boutargue"]),
  shomerShabbat: z.boolean(),
  meatWaitHours: z.union([
    z.literal(6),
    z.literal(5.5),
    z.literal(3),
    z.literal(1),
  ]),
  noFishWithMeat: z.boolean(),
  kitniyot: z.boolean(),
  israelCalendar: z.boolean(),
  allergies: z.array(z.string().min(1).max(40)).max(30),
  dislikes: z.array(z.string().min(1).max(40)).max(30),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export async function completeOnboarding(raw: OnboardingInput) {
  const input = onboardingSchema.parse(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const age = ageFromBirthYear(input.birthYear);
  if (age < 16) {
    return { ok: false as const, code: "too_young" as const };
  }

  const hasMedicalFlag = Object.values(input.medicalFlags).some(Boolean);
  // Brief §3.4: medical flags or minors -> general support mode, no weight-loss targets.
  const generalMode = hasMedicalFlag || age < 18;
  const goalType = generalMode ? "maintien" : input.goalType;

  const tdee = computeTdee({
    gender: input.gender,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    age,
    activityLevel: input.activityLevel,
  });

  let calorieTarget: number | null = null;
  let proteinTarget: number | null = null;
  let weeklyRate: number | null = null;

  if (!generalMode) {
    weeklyRate =
      goalType === "perte" ? clampWeeklyRate(input.weeklyRatePct ?? 0.5) : null;
    calorieTarget = computeCalorieTarget({
      tdee,
      gender: input.gender,
      weightKg: input.weightKg,
      goalType,
      weeklyRatePct: weeklyRate ?? undefined,
    }).calorieTarget;
    proteinTarget = computeProteinTarget(input.weightKg, goalType);
  }

  const today = new Date().toISOString().slice(0, 10);

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: input.displayName,
    gender: input.gender,
    birth_year: input.birthYear,
    height_cm: input.heightCm,
    city: input.city || null,
    onboarding_completed_at: new Date().toISOString(),
  });
  if (profileError) throw new Error(profileError.message);

  const { error: settingsError } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    mode: input.mode,
    shomer_shabbat: input.shomerShabbat,
    meat_to_dairy_wait_hours: input.meatWaitHours,
    no_fish_with_meat: input.noFishWithMeat,
    kitniyot: input.kitniyot,
    israel_calendar: input.israelCalendar,
  });
  if (settingsError) throw new Error(settingsError.message);

  const { error: healthError } = await supabase.from("health_profile").upsert({
    user_id: user.id,
    medical_flags: input.medicalFlags,
    allergies: input.allergies,
    dislikes: input.dislikes,
    consent_health_data_at: new Date().toISOString(),
  });
  if (healthError) throw new Error(healthError.message);

  await supabase
    .from("goals")
    .update({ status: "archived" })
    .eq("user_id", user.id)
    .eq("status", "active");

  const { error: goalError } = await supabase.from("goals").insert({
    user_id: user.id,
    type: goalType,
    target_weight_kg: generalMode ? null : input.targetWeightKg,
    weekly_rate_pct: weeklyRate,
    calorie_target: calorieTarget,
    protein_target_g: proteinTarget,
    activity_level: input.activityLevel,
    tdee_estimate: tdee,
  });
  if (goalError) throw new Error(goalError.message);

  const { error: weightError } = await supabase.from("weight_logs").upsert(
    {
      user_id: user.id,
      date: today,
      weight_kg: input.weightKg,
      source: "onboarding",
    },
    { onConflict: "user_id,date" },
  );
  if (weightError) throw new Error(weightError.message);

  redirect("/journal");
}
