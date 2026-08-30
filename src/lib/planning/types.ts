import type { KashrutClass } from "@/lib/kashrut/meal";

export type PlanMeal = "petit_dej" | "dej" | "diner";

/** One planned slot — a snapshot, independent from later recipe edits. */
export type PlanSlot = {
  date: string; // YYYY-MM-DD
  meal: PlanMeal;
  recipeId: string | null;
  title: string;
  icon: string | null;
  kashrutClass: KashrutClass | null;
  isFish: boolean;
  kcal: number | null;
  proteinG: number | null;
  timeMin: number | null;
  hasHametz: boolean;
  hasKitniyot: boolean;
  tags: string[];
  isLeftover: boolean;
  locked: boolean;
  servings: number;
};

/** Everything the validator and planners need to know about the user/week. */
export type PlanContext = {
  weekStart: string; // Monday, YYYY-MM-DD
  calorieTarget: number | null;
  /** false = the user does not follow kosher rules — skip them entirely. */
  kashrutEnabled: boolean;
  shomerShabbat: boolean;
  meatToDairyWaitHours: number;
  dairyToMeatWaitHours: number;
  eatsKitniyot: boolean;
  pessahDates: ReadonlySet<string>;
  fastDates: ReadonlySet<string>;
};

/** A recipe as seen by the planners (already visible to the user). */
export type PlannerRecipe = {
  id: string;
  title: string;
  icon: string | null;
  kashrutClass: KashrutClass | null;
  isFish: boolean;
  category: string | null;
  kcal: number | null;
  proteinG: number | null;
  timeMin: number | null;
  hasHametz: boolean;
  hasKitniyot: boolean;
  tags: string[];
};

export type PlanViolation = {
  date: string | null;
  meal: PlanMeal | null;
  rule:
    | "meat_dairy_wait"
    | "chabbat_missing"
    | "chabbat_cooking"
    | "pessah_hametz"
    | "pessah_kitniyot"
    | "fast_day"
    | "calorie_target";
  message: string;
};
