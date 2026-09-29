import "server-only";

import { generateObject } from "ai";
import { z } from "zod";

import { MEAL_PLANNER_SYSTEM } from "@/ai/prompts/meal-planner";
import { pickModel } from "@/ai/provider";
import type { PlannerRecipe, PlanSlot } from "@/lib/planning/types";
import { weekDates } from "@/lib/planning/week";

const weekPlanSchema = z.object({
  days: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        meals: z
          .array(
            z.object({
              meal: z.enum(["petit_dej", "dej", "diner"]),
              recipe_id: z.string().max(60),
              is_leftover: z.boolean(),
            }),
          )
          .max(3),
      }),
    )
    .min(5)
    .max(7),
});

function catalogLine(recipe: PlannerRecipe): string {
  const parts = [
    recipe.id,
    recipe.title,
    recipe.category ?? "",
    recipe.timeMin === null ? "" : `${recipe.timeMin} min`,
    recipe.tags.length > 0 ? `#${recipe.tags.join(" #")}` : "",
  ];
  return parts.filter(Boolean).join(" | ");
}

/** One AI planning attempt; returns null without a key or on failure. */
export async function generateWeekPlanAi(input: {
  recipes: PlannerRecipe[];
  weekStart: string;
  constraints: string | null;
  previousViolations: string[] | null;
}): Promise<PlanSlot[] | null> {
  const picked = pickModel("chat");
  if (!picked) return null;

  const { weekStart } = input;
  const byId = new Map(input.recipes.map((recipe) => [recipe.id, recipe]));
  const promptParts = [
    `Semaine du ${weekStart} (lundi) : ${weekDates(weekStart).join(", ")}.`,
    input.constraints
      ? `Contraintes de la personne : ${input.constraints}`
      : "",
    input.previousViolations && input.previousViolations.length > 0
      ? `Ta proposition précédente violait ces règles, corrige-les impérativement : ${input.previousViolations.join(" ; ")}`
      : "",
    `Catalogue de recettes :\n${input.recipes.map(catalogLine).join("\n")}`,
  ];

  try {
    const { object } = await generateObject({
      model: picked.model,
      schema: weekPlanSchema,
      system: MEAL_PLANNER_SYSTEM,
      prompt: promptParts.filter(Boolean).join("\n\n"),
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(30_000),
    });

    const validDates = new Set(weekDates(weekStart));
    const slots: PlanSlot[] = [];
    for (const day of object.days) {
      if (!validDates.has(day.date)) continue;
      for (const meal of day.meals) {
        const recipe = byId.get(meal.recipe_id);
        if (!recipe) continue;
        slots.push({
          date: day.date,
          meal: meal.meal,
          recipeId: recipe.id,
          title: recipe.title,
          icon: recipe.icon,
          kcal: recipe.kcal,
          proteinG: recipe.proteinG,
          timeMin: recipe.timeMin,
          tags: recipe.tags,
          isLeftover: meal.is_leftover,
          locked: false,
          servings: 1,
        });
      }
    }
    return slots.length > 0 ? slots : null;
  } catch (error) {
    console.error("meal planner generation failed", error);
    return null;
  }
}
