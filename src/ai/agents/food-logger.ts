import "server-only";

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
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

// ADR-010: Gemini Flash by default (cost), Claude as fallback provider.
const GEMINI_MODEL = "gemini-3.7-flash";
const ANTHROPIC_MODEL = "claude-sonnet-5";

function pickModel() {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google(GEMINI_MODEL);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic(ANTHROPIC_MODEL);
  }
  return null;
}

export function isAiConfigured(): boolean {
  return pickModel() !== null;
}

export async function extractFoodItems(input: {
  text?: string;
  imageBase64?: string;
  imageMediaType?: string;
}): Promise<FoodExtraction | null> {
  const model = pickModel();
  if (!model) return null;

  try {
    const { object } = await generateObject({
      model,
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
