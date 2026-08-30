export type WorkoutGoal = "force" | "muscle" | "perte" | "forme";
export type WorkoutEquipment = "rien" | "elastiques" | "halteres" | "salle";
export type WorkoutLevel = "debutant" | "intermediaire" | "avance";

export type LibraryExercise = {
  id: string;
  slug: string;
  name_fr: string;
  kind: string;
  muscle_groups: string[];
  equipment: string[];
  level: WorkoutLevel;
  met: number;
  cues: string;
  mistakes: string;
};

export type ProgramExercise = {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  restSec: number;
  met: number;
  cues: string;
};

export type ProgramDay = {
  day: number;
  title: string;
  exercises: ProgramExercise[];
};

export type ProgramWeek = {
  week: number;
  note: string | null;
  days: ProgramDay[];
};

export type ProgramParams = {
  goal: WorkoutGoal;
  daysPerWeek: number;
  equipment: WorkoutEquipment;
  level: WorkoutLevel;
  durationMin: number;
};

export type WorkoutProgramPlan = ProgramParams & {
  weeks: ProgramWeek[];
};
