import type { WorkoutProgramPlan } from "./types";

const WEEKS_EXPECTED = 4;

/**
 * Programmatic validation (brief §8): only library exercises, reasonable
 * volume, coherent structure. Returns human-readable French messages.
 */
export function validateProgram(
  program: WorkoutProgramPlan,
  libraryIds: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];

  if (program.weeks.length !== WEEKS_EXPECTED) {
    errors.push(
      `${program.weeks.length} semaines au lieu de ${WEEKS_EXPECTED}.`,
    );
  }

  program.weeks.forEach((week, index) => {
    if (week.week !== index + 1) {
      errors.push(`Numérotation de semaine incohérente (${week.week}).`);
    }
    if (week.days.length !== program.daysPerWeek) {
      errors.push(
        `Semaine ${week.week} : ${week.days.length} jours au lieu de ${program.daysPerWeek}.`,
      );
    }
    for (const day of week.days) {
      if (day.exercises.length < 3 || day.exercises.length > 8) {
        errors.push(
          `Semaine ${week.week} jour ${day.day} : ${day.exercises.length} exercices (attendu 3 à 8).`,
        );
      }
      let totalSets = 0;
      for (const exercise of day.exercises) {
        if (!libraryIds.has(exercise.exerciseId)) {
          errors.push(
            `Exercice inconnu de la bibliothèque : ${exercise.name}.`,
          );
        }
        if (exercise.sets < 1 || exercise.sets > 6) {
          errors.push(
            `${exercise.name} : ${exercise.sets} séries hors bornes.`,
          );
        }
        if (exercise.reps < 1 || exercise.reps > 30) {
          errors.push(`${exercise.name} : ${exercise.reps} reps hors bornes.`);
        }
        if (exercise.restSec < 15 || exercise.restSec > 300) {
          errors.push(
            `${exercise.name} : repos ${exercise.restSec}s hors bornes.`,
          );
        }
        totalSets += exercise.sets;
      }
      if (totalSets > 32) {
        errors.push(
          `Semaine ${week.week} jour ${day.day} : volume excessif (${totalSets} séries).`,
        );
      }
    }
  });

  return errors;
}
