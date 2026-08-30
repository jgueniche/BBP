import "server-only";

import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

import { FOOD_LOGGER_SYSTEM } from "@/ai/prompts/food-logger";

const extractionSchema = z.object({
  meal_guess: z
    .enum(["petit_dej", "dej", "diner", "collation"])
    .nullable()
    .describe("Repas deviné, ou null si indéterminable"),
  items: z
    .array(
      z.object({
        name: z.string().describe("Nom français simple de l'aliment"),
        grams: z
          .number()
          .positive()
          .describe("Quantité estimée en grammes (ou ml pour un liquide)"),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(12),
});

export type FoodExtraction = z.infer<typeof extractionSchema>;

const MODEL = "claude-sonnet-5";

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function extractFoodItems(input: {
  text?: string;
  imageBase64?: string;
  imageMediaType?: string;
}): Promise<FoodExtraction | null> {
  if (!isAiConfigured()) return null;

  try {
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: extractionSchema,
      system: FOOD_LOGGER_SYSTEM,
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
                    input.text && input.text.length > 0
                      ? input.text
                      : "Voici la photo de mon repas.",
                },
              ]
            : [{ type: "text" as const, text: input.text ?? "" }],
        },
      ],
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(20_000),
    });
    return object;
  } catch (error) {
    console.error("food_logger extraction failed", error);
    return null;
  }
}
