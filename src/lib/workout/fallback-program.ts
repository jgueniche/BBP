import type {
  LibraryExercise,
  ProgramDay,
  ProgramExercise,
  ProgramParams,
  ProgramWeek,
  WorkoutEquipment,
  WorkoutLevel,
  WorkoutProgramPlan,
} from "./types";

/** Equipment each home setup unlocks ("salle" unlocks everything). */
const EQUIPMENT_SETS: Record<WorkoutEquipment, ReadonlySet<string> | null> = {
  rien: new Set(["poids_du_corps"]),
  elastiques: new Set(["poids_du_corps", "elastiques"]),
  halteres: new Set(["poids_du_corps", "elastiques", "halteres", "banc"]),
  salle: null, // everything
};

const LEVEL_ORDER: WorkoutLevel[] = ["debutant", "intermediaire", "avance"];

type SetsScheme = { sets: number; reps: number; restSec: number };

const SCHEMES: Record<ProgramParams["goal"], SetsScheme> = {
  force: { sets: 4, reps: 6, restSec: 150 },
  muscle: { sets: 3, reps: 10, restSec: 90 },
  perte: { sets: 3, reps: 15, restSec: 60 },
  forme: { sets: 3, reps: 12, restSec: 75 },
};

/** Muscle-group slots per training day, by weekly frequency. */
const DAY_TEMPLATES: Record<
  number,
  Array<{ title: string; slots: string[][] }>
> = {
  1: [
    {
      title: "Full body",
      slots: [
        ["quadriceps"],
        ["pectoraux"],
        ["dos"],
        ["ischios", "fessiers"],
        ["epaules"],
        ["abdos"],
      ],
    },
  ],
  2: [
    {
      title: "Full body A",
      slots: [["quadriceps"], ["pectoraux"], ["dos"], ["epaules"], ["abdos"]],
    },
    {
      title: "Full body B",
      slots: [
        ["ischios", "fessiers"],
        ["dos"],
        ["pectoraux"],
        ["biceps", "triceps"],
        ["abdos"],
      ],
    },
  ],
  3: [
    {
      title: "Full body A",
      slots: [["quadriceps"], ["pectoraux"], ["dos"], ["epaules"], ["abdos"]],
    },
    {
      title: "Full body B",
      slots: [
        ["ischios", "fessiers"],
        ["dos"],
        ["pectoraux"],
        ["biceps"],
        ["abdos"],
      ],
    },
    {
      title: "Full body C",
      slots: [
        ["quadriceps"],
        ["epaules"],
        ["dos"],
        ["triceps"],
        ["cardio", "corps_entier"],
      ],
    },
  ],
  4: [
    {
      title: "Haut du corps A",
      slots: [["pectoraux"], ["dos"], ["epaules"], ["biceps"], ["triceps"]],
    },
    {
      title: "Bas du corps A",
      slots: [
        ["quadriceps"],
        ["ischios", "fessiers"],
        ["fessiers"],
        ["mollets"],
        ["abdos"],
      ],
    },
    {
      title: "Haut du corps B",
      slots: [["dos"], ["pectoraux"], ["epaules"], ["triceps"], ["abdos"]],
    },
    {
      title: "Bas du corps B",
      slots: [
        ["ischios", "fessiers"],
        ["quadriceps"],
        ["fessiers"],
        ["abdos"],
        ["cardio", "corps_entier"],
      ],
    },
  ],
  5: [
    {
      title: "Push (poussée)",
      slots: [
        ["pectoraux"],
        ["epaules"],
        ["pectoraux"],
        ["triceps"],
        ["abdos"],
      ],
    },
    {
      title: "Pull (tirage)",
      slots: [
        ["dos"],
        ["dos"],
        ["trapezes", "epaules"],
        ["biceps"],
        ["lombaires"],
      ],
    },
    {
      title: "Jambes",
      slots: [
        ["quadriceps"],
        ["ischios", "fessiers"],
        ["fessiers"],
        ["mollets"],
        ["abdos"],
      ],
    },
    {
      title: "Haut du corps",
      slots: [["pectoraux"], ["dos"], ["epaules"], ["biceps"], ["triceps"]],
    },
    {
      title: "Full body / cardio",
      slots: [
        ["quadriceps"],
        ["dos"],
        ["corps_entier", "cardio"],
        ["cardio"],
        ["abdos"],
      ],
    },
  ],
  6: [
    {
      title: "Push A",
      slots: [
        ["pectoraux"],
        ["epaules"],
        ["triceps"],
        ["pectoraux"],
        ["abdos"],
      ],
    },
    {
      title: "Pull A",
      slots: [
        ["dos"],
        ["dos"],
        ["biceps"],
        ["trapezes", "epaules"],
        ["lombaires"],
      ],
    },
    {
      title: "Jambes A",
      slots: [
        ["quadriceps"],
        ["ischios", "fessiers"],
        ["fessiers"],
        ["mollets"],
        ["abdos"],
      ],
    },
    {
      title: "Push B",
      slots: [["epaules"], ["pectoraux"], ["triceps"], ["abdos"], ["cardio"]],
    },
    {
      title: "Pull B",
      slots: [["dos"], ["biceps"], ["dos"], ["lombaires"], ["abdos"]],
    },
    {
      title: "Jambes B",
      slots: [
        ["ischios", "fessiers"],
        ["quadriceps"],
        ["mollets"],
        ["fessiers"],
        ["cardio", "corps_entier"],
      ],
    },
  ],
};

function seedFrom(params: ProgramParams): number {
  const key = `${params.goal}|${params.daysPerWeek}|${params.equipment}|${params.level}`;
  let hash = 7;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) % 99_991;
  return hash;
}

function usableExercise(
  exercise: LibraryExercise,
  params: ProgramParams,
): boolean {
  const allowed = EQUIPMENT_SETS[params.equipment];
  if (allowed !== null) {
    if (!exercise.equipment.every((piece) => allowed.has(piece))) return false;
  }
  const levelIndex = LEVEL_ORDER.indexOf(params.level);
  if (LEVEL_ORDER.indexOf(exercise.level) > levelIndex) return false;
  return exercise.kind === "muscu" || exercise.kind === "fonctionnel";
}

/**
 * Deterministic 4-week program: proven splits by weekly frequency, library
 * exercises filtered by equipment/level, goal-based set schemes, light
 * week-4 deload. Always passes validateProgram for the seeded library.
 */
export function buildFallbackProgram(
  library: LibraryExercise[],
  params: ProgramParams,
): WorkoutProgramPlan {
  const pool = library.filter((exercise) => usableExercise(exercise, params));
  const scheme = SCHEMES[params.goal];
  const seed = seedFrom(params);
  // Roughly 8 minutes per exercise (sets × work+rest), clamped 4..6.
  const perDay = Math.min(6, Math.max(4, Math.round(params.durationMin / 9)));

  const templates = DAY_TEMPLATES[Math.min(6, Math.max(1, params.daysPerWeek))];
  let rotation = seed;

  const baseDays: ProgramDay[] = templates.map((template, dayIndex) => {
    const used = new Set<string>();
    const exercises: ProgramExercise[] = [];
    for (const slot of template.slots.slice(0, perDay)) {
      let candidates = pool.filter(
        (exercise) =>
          !used.has(exercise.id) &&
          slot.some((group) => exercise.muscle_groups.includes(group)),
      );
      if (candidates.length === 0) {
        candidates = pool.filter((exercise) => !used.has(exercise.id));
      }
      if (candidates.length === 0) break;
      const pick = candidates[rotation % candidates.length];
      rotation += 1;
      used.add(pick.id);
      const isCardioSlot = slot.includes("cardio") && pick.kind !== "muscu";
      exercises.push({
        exerciseId: pick.id,
        name: pick.name_fr,
        sets: isCardioSlot ? 1 : scheme.sets,
        reps: isCardioSlot ? 1 : scheme.reps,
        restSec: scheme.restSec,
        met: pick.met,
        cues: pick.cues,
      });
    }
    // Pad thin days (tiny pools) so the structure stays valid.
    while (exercises.length < 3 && pool.length > exercises.length) {
      const filler = pool[rotation % pool.length];
      rotation += 1;
      if (exercises.some((e) => e.exerciseId === filler.id)) continue;
      exercises.push({
        exerciseId: filler.id,
        name: filler.name_fr,
        sets: scheme.sets,
        reps: scheme.reps,
        restSec: scheme.restSec,
        met: filler.met,
        cues: filler.cues,
      });
    }
    return { day: dayIndex + 1, title: template.title, exercises };
  });

  const weeks: ProgramWeek[] = [1, 2, 3, 4].map((week) => ({
    week,
    note:
      week === 4
        ? "Semaine allégée (deload) : on récupère pour mieux repartir."
        : week === 3
          ? "Semaine la plus dense : une série de plus sur les deux premiers exercices."
          : null,
    days: baseDays.map((day) => ({
      day: day.day,
      title: day.title,
      exercises: day.exercises.map((exercise, index) => {
        if (exercise.sets === 1) return { ...exercise }; // cardio slots
        if (week === 2) {
          return { ...exercise, reps: Math.min(30, exercise.reps + 2) };
        }
        if (week === 3) {
          return index < 2
            ? { ...exercise, sets: Math.min(6, exercise.sets + 1) }
            : { ...exercise };
        }
        if (week === 4) {
          return { ...exercise, sets: Math.max(2, exercise.sets - 1) };
        }
        return { ...exercise };
      }),
    })),
  }));

  return { ...params, weeks };
}
