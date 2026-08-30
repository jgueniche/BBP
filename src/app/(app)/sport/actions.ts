"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { generateSessionReaction } from "@/ai/agents/workout-planner";
import { fr } from "@/i18n/fr";
import { generateAndStoreProgram } from "@/lib/workout/generate";
import { kcalForActivity, parseQuickActivity } from "@/lib/workout/met";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

async function latestWeight(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from("weight_logs")
    .select("weight_kg")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.weight_kg ?? 75;
}

const programParamsSchema = z.object({
  goal: z.enum(["force", "muscle", "perte", "forme"]),
  daysPerWeek: z.number().int().min(1).max(6),
  equipment: z.enum(["rien", "elastiques", "halteres", "salle"]),
  level: z.enum(["debutant", "intermediaire", "avance"]),
  durationMin: z.number().int().min(15).max(120),
});

export async function generateProgram(
  raw: z.infer<typeof programParamsSchema>,
) {
  const params = programParamsSchema.parse(raw);
  const { supabase, user } = await requireUser();
  const result = await generateAndStoreProgram(supabase, user.id, params);
  revalidatePath("/sport");
  return result;
}

export async function logActivity(raw: string) {
  const text = z.string().min(3).max(120).parse(raw);
  const parsed = parseQuickActivity(text);
  if (!parsed) return { ok: false as const };
  const { supabase, user } = await requireUser();

  const weight = await latestWeight(supabase, user.id);
  const kcal = kcalForActivity(parsed.met, weight, parsed.minutes);
  const { error } = await supabase.from("workout_sessions").insert({
    user_id: user.id,
    kind: "activity",
    label: parsed.label,
    duration_min: parsed.minutes,
    kcal_est: kcal,
    notes: text,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/sport");
  return { ok: true as const, label: parsed.label, kcal };
}

const performedSchema = z
  .array(
    z.object({
      exerciseId: z.string().max(60),
      name: z.string().max(120),
      met: z.number().min(1).max(20),
      sets: z
        .array(
          z.object({
            reps: z.number().int().min(0).max(100),
            weightKg: z.number().min(0).max(500).nullable(),
            done: z.boolean(),
          }),
        )
        .max(8),
    }),
  )
  .min(1)
  .max(10);

const completeSchema = z.object({
  programId: z.uuid(),
  weekNumber: z.number().int().min(1).max(4),
  dayNumber: z.number().int().min(1).max(7),
  title: z.string().max(80),
  performed: performedSchema,
  durationMin: z.number().int().min(1).max(300),
  rpe: z.number().int().min(1).max(10).nullable(),
});

export async function completeSession(raw: z.infer<typeof completeSchema>) {
  const input = completeSchema.parse(raw);
  const { supabase, user } = await requireUser();

  const weight = await latestWeight(supabase, user.id);
  const doneExercises = input.performed.filter((exercise) =>
    exercise.sets.some((set) => set.done),
  );
  const meanMet =
    doneExercises.length > 0
      ? doneExercises.reduce((sum, e) => sum + e.met, 0) / doneExercises.length
      : 5;
  const kcal = kcalForActivity(meanMet, weight, input.durationMin);

  const { error } = await supabase.from("workout_sessions").insert({
    user_id: user.id,
    program_id: input.programId,
    kind: "program",
    label: input.title,
    week_number: input.weekNumber,
    day_number: input.dayNumber,
    performed: input.performed,
    duration_min: input.durationMin,
    kcal_est: kcal,
    rpe: input.rpe,
  });
  if (error) throw new Error(error.message);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const aiReaction = await generateSessionReaction({
    label: input.title,
    durationMin: input.durationMin,
    kcal,
    rpe: input.rpe,
    displayName: profile?.display_name ?? null,
  });
  const canned = fr.sport.reactions;
  const reaction =
    aiReaction ?? canned[(kcal + input.durationMin) % canned.length];

  revalidatePath("/sport");
  return { ok: true as const, kcal, reaction };
}
