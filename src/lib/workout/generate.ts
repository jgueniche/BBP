import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { generateProgramAi } from "@/ai/agents/workout-planner";
import type { Database } from "@/db/types";

import { buildFallbackProgram } from "./fallback-program";
import type {
  LibraryExercise,
  ProgramParams,
  WorkoutLevel,
  WorkoutProgramPlan,
} from "./types";
import { validateProgram } from "./validate";

type Supabase = SupabaseClient<Database>;

export async function loadExerciseLibrary(
  supabase: Supabase,
): Promise<LibraryExercise[]> {
  const { data } = await supabase.from("exercises").select("*");
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name_fr: row.name_fr,
    kind: row.kind,
    muscle_groups: row.muscle_groups,
    equipment: row.equipment,
    level: row.level as WorkoutLevel,
    met: row.met,
    cues: row.cues,
    mistakes: row.mistakes,
  }));
}

export type StoredProgram =
  | { ok: true; generatedBy: "ai" | "fallback"; daysPerWeek: number }
  | { ok: false };

/**
 * Generate a validated 4-week program (AI ×2 with errors fed back, then the
 * deterministic builder), archive the previous one and store the new one.
 */
export async function generateAndStoreProgram(
  supabase: Supabase,
  userId: string,
  params: ProgramParams,
): Promise<StoredProgram> {
  const library = await loadExerciseLibrary(supabase);
  if (library.length < 20) return { ok: false };
  const libraryIds = new Set(library.map((exercise) => exercise.id));

  let plan: WorkoutProgramPlan | null = null;
  let generatedBy: "ai" | "fallback" = "fallback";
  let previousErrors: string[] | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const aiPlan = await generateProgramAi({ library, params, previousErrors });
    if (aiPlan === null) break;
    const errors = validateProgram(aiPlan, libraryIds);
    if (errors.length === 0) {
      plan = aiPlan;
      generatedBy = "ai";
      break;
    }
    previousErrors = errors.slice(0, 8);
  }
  if (plan === null) {
    plan = buildFallbackProgram(library, params);
    if (validateProgram(plan, libraryIds).length > 0) return { ok: false };
  }

  await supabase
    .from("workout_programs")
    .update({ status: "archived" })
    .eq("user_id", userId)
    .eq("status", "active");
  const { error } = await supabase.from("workout_programs").insert({
    user_id: userId,
    goal: params.goal,
    days_per_week: params.daysPerWeek,
    equipment: params.equipment,
    level: params.level,
    duration_min: params.durationMin,
    weeks: plan.weeks,
    generated_by: generatedBy,
  });
  if (error) throw new Error(error.message);

  return { ok: true, generatedBy, daysPerWeek: params.daysPerWeek };
}
