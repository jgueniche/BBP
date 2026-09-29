export type PlanMeal = "petit_dej" | "dej" | "diner";

/** One planned slot — a snapshot, independent from later recipe edits. */
export type PlanSlot = {
  date: string; // YYYY-MM-DD
  meal: PlanMeal;
  recipeId: string | null;
  title: string;
  icon: string | null;
  kcal: number | null;
  proteinG: number | null;
  timeMin: number | null;
  tags: string[];
  isLeftover: boolean;
  locked: boolean;
  servings: number;
};

/** Everything the validator and planners need to know about the week. */
export type PlanContext = {
  weekStart: string; // Monday, YYYY-MM-DD
  /**
   * Recipes known not to suit the person's cooking rules (not compatible as
   * they are). The planner never applies swaps, so these stay out.
   */
  unsuitable: ReadonlySet<string>;
};

/** A recipe as seen by the planners (already visible to the user). */
export type PlannerRecipe = {
  id: string;
  title: string;
  icon: string | null;
  category: string | null;
  kcal: number | null;
  proteinG: number | null;
  timeMin: number | null;
  tags: string[];
};

export type PlanViolation = {
  date: string | null;
  meal: PlanMeal | null;
  rule: "cooking_rules";
  message: string;
};
