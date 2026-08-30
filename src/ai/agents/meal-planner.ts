import "server-only";

import { generateObject } from "ai";
import { z } from "zod";

import { MEAL_PLANNER_SYSTEM } from "@/ai/prompts/meal-planner";
import { pickModel } from "@/ai/provider";
import type {
  PlanContext,
  PlannerRecipe,
  PlanSlot,
} from "@/lib/planning/types";
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
              servings: z.number().min(0.5).max(4),
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
    recipe.kashrutClass ?? "?",
    recipe.kcal === null ? "kcal?" : `${Math.round(recipe.kcal)} kcal/portion`,
    recipe.proteinG === null ? "" : `${Math.round(recipe.proteinG)} g prot`,
    recipe.timeMin === null ? "" : `${recipe.timeMin} min`,
    recipe.hasHametz ? "HAMETZ" : "",
    recipe.hasKitniyot ? "KITNIYOT" : "",
    recipe.tags.length > 0 ? `#${recipe.tags.join(" #")}` : "",
  ];
  return parts.filter(Boolean).join(" | ");
}

/** One AI planning attempt; returns null without a key or on failure. */
export async function generateWeekPlanAi(input: {
  recipes: PlannerRecipe[];
  ctx: PlanContext;
  calendarText: string;
  constraints: string | null;
  previousViolations: string[] | null;
}): Promise<PlanSlot[] | null> {
  const picked = pickModel("chat");
  if (!picked) return null;

  const { ctx } = input;
  const byId = new Map(input.recipes.map((recipe) => [recipe.id, recipe]));
  const promptParts = [
    `Semaine du ${ctx.weekStart} (lundi) : ${weekDates(ctx.weekStart).join(", ")}.`,
    `Calendrier : ${input.calendarText}`,
    `Réglages : chabbat observé=${ctx.shomerShabbat} ; délai viande→lait=${ctx.meatToDairyWaitHours} h ; kitniyot à Pessah=${ctx.eatsKitniyot}.`,
    ctx.calorieTarget === null
      ? "Pas de cible calorique (mode plaisir) : portions = 1, varie."
      : `Cible : ${ctx.calorieTarget} kcal/jour (déjeuner+dîner ≈ 75 % à ±10 %).`,
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

    const validDates = new Set(weekDates(ctx.weekStart));
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
          kashrutClass: recipe.kashrutClass,
          isFish: recipe.isFish,
          kcal: recipe.kcal,
          proteinG: recipe.proteinG,
          timeMin: recipe.timeMin,
          hasHametz: recipe.hasHametz,
          hasKitniyot: recipe.hasKitniyot,
          tags: recipe.tags,
          isLeftover: meal.is_leftover,
          locked: false,
          servings: Math.round(meal.servings * 4) / 4,
        });
      }
    }
    return slots.length > 0 ? slots : null;
  } catch (error) {
    console.error("meal planner generation failed", error);
    return null;
  }
}
