import "server-only";

import { generateObject } from "ai";
import { z } from "zod";

import { MEMORY_EXTRACTOR_SYSTEM } from "@/ai/prompts/memory-extractor";
import { pickModel } from "@/ai/provider";

const memorySchema = z.object({
  facts: z.array(z.string().min(4).max(160)).max(3),
});

export async function extractMemories(exchange: {
  userMessage: string;
  assistantMessage: string;
}): Promise<string[]> {
  const picked = pickModel("light");
  if (!picked) return [];

  try {
    const { object } = await generateObject({
      model: picked.model,
      schema: memorySchema,
      system: MEMORY_EXTRACTOR_SYSTEM,
      prompt: `Utilisateur : ${exchange.userMessage}\nCoach : ${exchange.assistantMessage}`,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(15_000),
    });
    return object.facts;
  } catch (error) {
    console.error("memory extraction failed", error);
    return [];
  }
}
