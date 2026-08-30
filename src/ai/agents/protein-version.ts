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

const SYSTEM = `Tu es Kémia, coach nutrition de BBP. Tu crées la « version Protéine » d'une recette du patrimoine judéo-oriental : allégée et riche en protéines, mais toujours généreuse et fidèle au goût d'origine.
Techniques : viandes maigres (dinde, veau), cuisson au four plutôt que friture, moins d'huile, plus de légumes, semoule/pain complets, portions de féculents mesurées. Jamais d'ingrédient non casher, respecte la classe de la recette d'origine (viande/lait/parvé).
Chaque substitution est expliquée en une phrase simple. Quantités en grammes pour le nombre de portions indiqué.`;

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
