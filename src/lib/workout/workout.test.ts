import { describe, expect, it } from "vitest";

import { buildFallbackProgram } from "./fallback-program";
import { kcalForActivity, parseQuickActivity } from "./met";
import type { LibraryExercise, WorkoutProgramPlan } from "./types";
import { validateProgram } from "./validate";

function lib(
  id: string,
  name: string,
  groups: string[],
  equipment: string[],
  level: LibraryExercise["level"] = "debutant",
  kind = "muscu",
): LibraryExercise {
  return {
    id,
    slug: id,
    name_fr: name,
    kind,
    muscle_groups: groups,
    equipment,
    level,
    met: 5,
    cues: "c",
    mistakes: "m",
  };
}

const LIBRARY: LibraryExercise[] = [
  lib("e1", "Pompes", ["pectoraux", "triceps"], ["poids_du_corps"]),
  lib("e2", "Squat", ["quadriceps", "fessiers"], ["poids_du_corps"]),
  lib("e3", "Rowing élastique", ["dos"], ["elastiques"]),
  lib("e4", "Rowing haltère", ["dos"], ["halteres"]),
  lib("e5", "Développé haltères", ["epaules"], ["halteres"]),
  lib("e6", "Pont fessier", ["fessiers", "ischios"], ["poids_du_corps"]),
  lib("e7", "Planche", ["abdos"], ["poids_du_corps"]),
  lib("e8", "Curl haltères", ["biceps"], ["halteres"]),
  lib("e9", "Dips banc", ["triceps"], ["banc"]),
  lib("e10", "Rowing australien", ["dos", "biceps"], ["barre_fixe"]),
  lib("e11", "Fentes", ["quadriceps", "fessiers"], ["poids_du_corps"]),
  lib("e12", "Élévations latérales", ["epaules"], ["halteres"]),
  lib("e13", "Mollets debout", ["mollets"], ["poids_du_corps"]),
  lib("e14", "Superman", ["lombaires"], ["poids_du_corps"]),
  lib("e15", "Curl élastique", ["biceps"], ["elastiques"]),
  lib("e16", "Pike push-up", ["epaules", "triceps"], ["poids_du_corps"]),
  lib("e17", "Shrugs", ["trapezes"], ["halteres"]),
  lib(
    "e18",
    "Burpees",
    ["corps_entier", "cardio"],
    ["poids_du_corps"],
    "intermediaire",
    "fonctionnel",
  ),
  lib("e19", "SDT roumain haltères", ["ischios", "fessiers"], ["halteres"]),
  lib(
    "e20",
    "Développé couché barre",
    ["pectoraux"],
    ["barre", "banc"],
    "intermediaire",
  ),
];

const IDS = new Set(LIBRARY.map((e) => e.id));

describe("buildFallbackProgram — DoD: coherent programs across profiles", () => {
  const goals = ["force", "muscle", "perte", "forme"] as const;
  const equipments = ["rien", "elastiques", "halteres", "salle"] as const;

  it("passes the validator for every goal, frequency and equipment", () => {
    for (const goal of goals) {
      for (const days of [1, 2, 3, 4, 5, 6]) {
        for (const equipment of equipments) {
          const program = buildFallbackProgram(LIBRARY, {
            goal,
            daysPerWeek: days,
            equipment,
            level: "intermediaire",
            durationMin: 45,
          });
          const errors = validateProgram(program, IDS);
          expect(errors, `${goal}/${days}j/${equipment}`).toEqual([]);
        }
      }
    }
  });

  it("respects the equipment constraint", () => {
    const program = buildFallbackProgram(LIBRARY, {
      goal: "muscle",
      daysPerWeek: 3,
      equipment: "rien",
      level: "debutant",
      durationMin: 45,
    });
    const usedIds = new Set(
      program.weeks[0].days.flatMap((d) =>
        d.exercises.map((e) => e.exerciseId),
      ),
    );
    for (const id of usedIds) {
      const exercise = LIBRARY.find((e) => e.id === id)!;
      expect(
        exercise.equipment.every((piece) => piece === "poids_du_corps"),
        exercise.name_fr,
      ).toBe(true);
    }
  });

  it("deloads on week 4", () => {
    const program = buildFallbackProgram(LIBRARY, {
      goal: "muscle",
      daysPerWeek: 2,
      equipment: "halteres",
      level: "intermediaire",
      durationMin: 45,
    });
    const week1Sets = program.weeks[0].days[0].exercises[0].sets;
    const week4Sets = program.weeks[3].days[0].exercises[0].sets;
    expect(week4Sets).toBeLessThan(week1Sets);
    expect(program.weeks[3].note).toMatch(/allégée/);
  });
});

describe("validateProgram", () => {
  it("rejects unknown exercises and silly volume", () => {
    const program = buildFallbackProgram(LIBRARY, {
      goal: "muscle",
      daysPerWeek: 2,
      equipment: "salle",
      level: "debutant",
      durationMin: 45,
    });
    const broken: WorkoutProgramPlan = {
      ...program,
      weeks: program.weeks.map((week) => ({
        ...week,
        days: week.days.map((day) => ({
          ...day,
          exercises: day.exercises.map((exercise, i) =>
            i === 0
              ? { ...exercise, exerciseId: "hors-bibliotheque", sets: 9 }
              : exercise,
          ),
        })),
      })),
    };
    const errors = validateProgram(broken, IDS);
    expect(errors.some((e) => e.includes("inconnu"))).toBe(true);
    expect(errors.some((e) => e.includes("séries hors bornes"))).toBe(true);
  });
});

describe("MET helpers", () => {
  it("computes kcal from MET × weight × hours", () => {
    expect(kcalForActivity(3.5, 80, 60)).toBe(280);
    expect(kcalForActivity(9.8, 70, 30)).toBe(343);
  });

  it("parses quick activity phrases", () => {
    expect(parseQuickActivity("marche 30 min")).toMatchObject({
      label: "Marche",
      minutes: 30,
    });
    expect(parseQuickActivity("1h de vélo")).toMatchObject({
      label: "Vélo",
      minutes: 60,
    });
    expect(parseQuickActivity("foot 1h30")).toMatchObject({
      label: "Football",
      minutes: 90,
    });
    expect(parseQuickActivity("45 minutes de natation")).toMatchObject({
      label: "Natation",
      minutes: 45,
    });
    expect(parseQuickActivity("gym douce")).toBeNull();
    expect(parseQuickActivity("20 min de truc inconnu")).toMatchObject({
      label: "Activité",
      minutes: 20,
    });
  });
});
