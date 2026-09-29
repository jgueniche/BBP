import type { PlanContext, PlanSlot, PlanViolation } from "./types";

/**
 * Programmatic check of every plan (AI, fallback, manual edit): each planned
 * recipe suits the person's cooking rules as it is (ADR-032). The UI blocks
 * edits that would add a violation.
 */
export function validatePlan(
  slots: PlanSlot[],
  ctx: PlanContext,
): PlanViolation[] {
  const violations: PlanViolation[] = [];
  for (const slot of slots) {
    if (slot.recipeId !== null && ctx.unsuitable.has(slot.recipeId)) {
      violations.push({
        date: slot.date,
        meal: slot.meal,
        rule: "cooking_rules",
        message: `${slot.title} ne convient pas à tes règles de cuisine telle quelle.`,
      });
    }
  }
  return violations;
}
