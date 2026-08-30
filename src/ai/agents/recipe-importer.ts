import "server-only";

import { generateObject } from "ai";
import { z } from "zod";

import { RECIPE_IMPORTER_SYSTEM } from "@/ai/prompts/recipe-importer";
import { pickModel } from "@/ai/provider";
import type { RecipeDraft } from "@/lib/import/types";

const importedRecipeSchema = z.object({
  is_recipe: z.boolean(),
  title: z.string().max(120),
  description: z.string().max(300).nullable(),
  servings: z.number().int().min(1).max(24).nullable(),
  prep_min: z.number().int().min(0).max(600).nullable(),
  cook_min: z.number().int().min(0).max(1440).nullable(),
  icon: z.string().max(8).nullable(),
  tags: z.array(z.string().max(30)).max(8),
  ingredients: z
    .array(
      z.object({
        label: z.string().max(120),
        grams: z.number().positive().max(20000).nullable(),
        section: z.string().max(60).nullable(),
      }),
    )
    .max(30),
  steps: z
    .array(
      z.object({
        text: z.string().max(600),
        duration_min: z.number().int().min(1).max(720).nullable(),
        section: z.string().max(60).nullable(),
      }),
    )
    .max(25),
});

export type ImportedRecipeExtras = { icon: string | null };

/**
 * AI normalization of raw recipe text (caption, page text, transcript).
 * Returns null when no model key is configured or the call fails — callers
 * fall back to the structured/heuristic path.
 */
export async function importRecipeWithAi(input: {
  text: string;
  sourceUrl: string | null;
  sourceAuthor: string | null;
  imageBase64?: string;
  imageMediaType?: string;
}): Promise<(RecipeDraft & ImportedRecipeExtras) | null> {
  const picked = pickModel("chat");
  if (!picked) return null;

  const text = input.text.slice(0, 20_000);
  try {
    const { object } = await generateObject({
      model: picked.model,
      schema: importedRecipeSchema,
      system: RECIPE_IMPORTER_SYSTEM,
      messages: [
        {
          role: "user",
          content: input.imageBase64
            ? [
                {
                  type: "image" as const,
                  image: input.imageBase64,
                  mediaType: input.imageMediaType ?? "image/jpeg",
                },
                {
                  type: "text" as const,
                  text:
                    text.length > 0 ? text : "Voici la photo de la recette.",
                },
              ]
            : [{ type: "text" as const, text }],
        },
      ],
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(45_000),
    });
    if (!object.is_recipe || object.ingredients.length === 0) return null;
    return {
      title: object.title,
      description: object.description,
      servings: object.servings,
      prepMin: object.prep_min,
      cookMin: object.cook_min,
      tags: object.tags.map((t) => t.toLowerCase()),
      ingredients: object.ingredients.map((ingredient) => ({
        label: ingredient.label,
        grams: ingredient.grams,
        section: ingredient.section,
      })),
      steps: object.steps.map((step) => ({
        text: step.text,
        durationMin: step.duration_min,
        section: step.section,
      })),
      sourceUrl: input.sourceUrl,
      sourceAuthor: input.sourceAuthor,
      method: "ai",
      icon: object.icon,
    };
  } catch (error) {
    console.error("recipe import extraction failed", error);
    return null;
  }
}
