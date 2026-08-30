import "server-only";

import { generateObject } from "ai";
import { z } from "zod";

import { pickModel } from "@/ai/provider";
import type { RecipeClassification } from "@/lib/kashrut/classify";

const checkerSchema = z.object({
  kashrut_class: z.enum(["bassari", "halavi", "parve", "inconnu"]),
  is_fish: z.boolean(),
  confidence: z.number().min(0).max(1),
  flags: z.array(z.string().max(120)).max(5),
});

const SYSTEM = `Tu classifies une recette selon la cacherout : bassari (viande), halavi (lait) ou parvé (neutre ; le poisson est parvé avec is_fish=true).
Règles : la moindre viande => bassari ; le moindre produit laitier => halavi ; viande ET lait ensemble => inconnu avec un drapeau. Signale en drapeaux les ingrédients douteux (gélatine, présure, vin, E120, arômes, fruits de mer, porc). Tu donnes une indication, jamais une certification.`;

/** LLM refinement, called only when the rules confidence is < 0.8 (brief §5). */
export async function checkKashrut(
  ingredientLabels: string[],
): Promise<RecipeClassification | null> {
  const picked = pickModel("light");
  if (!picked) return null;

  try {
    const { object } = await generateObject({
      model: picked.model,
      schema: checkerSchema,
      system: SYSTEM,
      prompt: `Ingrédients : ${ingredientLabels.join(", ")}`,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(15_000),
    });
    return {
      kashrutClass:
        object.kashrut_class === "inconnu" ? null : object.kashrut_class,
      isFish: object.is_fish,
      confidence: object.confidence,
      flags: object.flags,
    };
  } catch (error) {
    console.error("kashrut checker failed", error);
    return null;
  }
}
