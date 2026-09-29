import "server-only";

import { generateObject } from "ai";
import { z } from "zod";

import { pickModel } from "@/ai/provider";

const proteinVersionSchema = z.object({
  title: z.string().max(90),
  description: z.string().max(240),
  ingredients: z
    .array(
      z.object({
        label: z.string().max(80),
        grams: z.number().positive().max(5000),
      }),
    )
    .min(2)
    .max(15),
  steps: z.array(z.string().max(400)).min(2).max(8),
  substitutions: z
    .array(
      z.object({
        original: z.string().max(80),
        replacement: z.string().max(80),
        reason: z.string().max(160),
      }),
    )
    .max(6),
});

export type ProteinVersion = z.infer<typeof proteinVersionSchema>;

// Pivot (ADR-029): the former « version Protéine » (a lighter, diet-oriented
// rewrite) now produces a vegetarian variant — useful to host every table,
// with no diet talk. Generalized to every regime in a later session.
const SYSTEM = `Tu crées la variante végétarienne d'une recette, pour l'application Copine en cuisine : ni viande, ni poisson, ni fruits de mer, ni gélatine animale, ni bouillon ou sauce d'origine animale, en restant généreuse et fidèle au goût et à l'esprit du plat d'origine.
Techniques : légumineuses, tofu, tempeh, champignons, œufs ou fromage quand ils conviennent, épices et umami (sauce soja, miso, tomate séchée) pour garder la profondeur. Aucun conseil de régime ni de calories.
Chaque substitution est expliquée en une phrase simple. Quantités en grammes pour le nombre de portions indiqué. Tout en français.`;

export async function generateProteinVersion(input: {
  title: string;
  servings: number;
  ingredients: Array<{ label: string; grams: number | null }>;
  steps: string[];
}): Promise<ProteinVersion | null> {
  const picked = pickModel("chat");
  if (!picked) return null;

  try {
    const { object } = await generateObject({
      model: picked.model,
      schema: proteinVersionSchema,
      system: SYSTEM,
      prompt: `Recette d'origine : ${input.title} (${input.servings} portions).
Ingrédients : ${input.ingredients.map((i) => `${i.label}${i.grams ? ` (${i.grams} g)` : ""}`).join(", ")}.
Étapes : ${input.steps.join(" | ")}`,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(30_000),
    });
    return object;
  } catch (error) {
    console.error("protein version generation failed", error);
    return null;
  }
}
