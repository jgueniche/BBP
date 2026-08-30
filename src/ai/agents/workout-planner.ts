import "server-only";

import { generateObject, generateText } from "ai";
import { z } from "zod";

import { WORKOUT_PLANNER_SYSTEM } from "@/ai/prompts/workout-planner";
import { pickModel } from "@/ai/provider";
import type {
  LibraryExercise,
  ProgramParams,
  WorkoutProgramPlan,
} from "@/lib/workout/types";

const programSchema = z.object({
  weeks: z
    .array(
      z.object({
        week: z.number().int().min(1).max(4),
        note: z.string().max(160).nullable(),
        days: z
          .array(
            z.object({
              day: z.number().int().min(1).max(7),
              title: z.string().max(60),
              exercises: z
                .array(
                  z.object({
                    exercise_id: z.string().max(60),
                    sets: z.number().int().min(1).max(6),
                    reps: z.number().int().min(1).max(30),
                    rest_sec: z.number().int().min(15).max(300),
                  }),
                )
                .min(3)
                .max(8),
            }),
          )
          .min(1)
          .max(6),
      }),
    )
    .length(4),
});

/** One AI attempt at a 4-week program; null without a key or on failure. */
export async function generateProgramAi(input: {
  library: LibraryExercise[];
  params: ProgramParams;
  previousErrors: string[] | null;
}): Promise<WorkoutProgramPlan | null> {
  const picked = pickModel("chat");
  if (!picked) return null;

  const byId = new Map(
    input.library.map((exercise) => [exercise.id, exercise]),
  );
  const catalog = input.library
    .map(
      (exercise) =>
        `${exercise.id} | ${exercise.name_fr} | ${exercise.muscle_groups.join("+")} | ${exercise.equipment.join("+") || "aucun"} | ${exercise.level}`,
    )
    .join("\n");
  const { params } = input;

  try {
    const { object } = await generateObject({
      model: picked.model,
      schema: programSchema,
      system: WORKOUT_PLANNER_SYSTEM,
      prompt: [
        `Objectif : ${params.goal}. ${params.daysPerWeek} séances/semaine de ~${params.durationMin} min. Matériel : ${params.equipment}. Niveau : ${params.level}.`,
        input.previousErrors && input.previousErrors.length > 0
          ? `Ta proposition précédente était invalide, corrige : ${input.previousErrors.join(" ; ")}`
          : "",
        `Catalogue (id | nom | groupes | matériel | niveau) :\n${catalog}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(45_000),
    });

    return {
      ...params,
      weeks: object.weeks.map((week) => ({
        week: week.week,
        note: week.note,
        days: week.days.map((day) => ({
          day: day.day,
          title: day.title,
          exercises: day.exercises.flatMap((exercise) => {
            const found = byId.get(exercise.exercise_id);
            if (!found) return [];
            return [
              {
                exerciseId: found.id,
                name: found.name_fr,
                sets: exercise.sets,
                reps: exercise.reps,
                restSec: exercise.rest_sec,
                met: found.met,
                cues: found.cues,
              },
            ];
          }),
        })),
      })),
    };
  } catch (error) {
    console.error("workout program generation failed", error);
    return null;
  }
}

const REACTION_SYSTEM = `Tu es Kémia, la tata coach de BBP. On te donne le résumé d'une séance de sport qui vient de se terminer.
Réagis en 1 à 2 phrases : chaleureuse, drôle, fière — jamais culpabilisante. Maximum une expression judéo-arabe (bsahtek, mabrouk, tsahi…), maximum un emoji jamais en début de phrase. Tutoie.`;

/** Post-session Kémia reaction; null without a key (caller uses canned lines). */
export async function generateSessionReaction(input: {
  label: string;
  durationMin: number | null;
  kcal: number | null;
  rpe: number | null;
  displayName: string | null;
}): Promise<string | null> {
  const picked = pickModel("light");
  if (!picked) return null;
  try {
    const { text } = await generateText({
      model: picked.model,
      system: REACTION_SYSTEM,
      prompt: `Séance : ${input.label}. Durée : ${input.durationMin ?? "?"} min. ~${input.kcal ?? "?"} kcal. Effort ressenti (RPE) : ${input.rpe ?? "?"}/10. Prénom : ${input.displayName ?? "?"}.`,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(15_000),
    });
    const trimmed = text.trim();
    return trimmed.length > 0 && trimmed.length <= 300 ? trimmed : null;
  } catch (error) {
    console.error("session reaction failed", error);
    return null;
  }
}
