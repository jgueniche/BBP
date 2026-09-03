import "server-only";

import { generateText } from "ai";

import { NUDGER_SYSTEM } from "@/ai/prompts/nudger";
import { pickModel } from "@/ai/provider";
import { fr } from "@/i18n/fr";

export type NudgeSlot = "matin" | "soir" | "dafina" | "recap";

const t = fr.notifications;

function cannedPool(slot: NudgeSlot, parisWeekday: number): readonly string[] {
  if (slot === "soir" && parisWeekday === 4) return t.soirJeudi;
  if (slot === "soir") return t.soir;
  if (slot === "dafina") return t.dafina;
  return t.matin;
}

const SLOT_BRIEF: Record<Exclude<NudgeSlot, "recap">, string> = {
  matin: "Invite à faire la pesée du matin, léger et rapide.",
  soir: "Invite à noter les repas du jour dans le journal.",
  dafina:
    "C'est vendredi midi : rappelle en souriant de lancer la dafina pour chabbat et souhaite chabbat chalom.",
};

/**
 * One-sentence Kémia nudge. AI when a light model is configured, canned
 * rotation otherwise — the cron never depends on an API key.
 */
export async function generateNudgeBody(input: {
  slot: NudgeSlot;
  parisWeekday: number;
  dayOfYear: number;
}): Promise<string> {
  const pool = cannedPool(input.slot, input.parisWeekday);
  const canned = pool[input.dayOfYear % pool.length];
  if (input.slot === "recap") return canned;

  const picked = pickModel("light");
  if (!picked) return canned;

  let brief = SLOT_BRIEF[input.slot];
  if (input.slot === "soir" && input.parisWeekday === 4) {
    brief +=
      " C'est jeudi : glisse un rappel des courses de chabbat pour demain.";
  }

  try {
    const { text } = await generateText({
      model: picked.model,
      system: NUDGER_SYSTEM,
      prompt: brief,
      // Gemini 3.7 Flash reasons before answering: a 100-token cap truncated
      // the sentence. Same budget and thinking level as the promptfoo eval.
      maxOutputTokens: 512,
      providerOptions: {
        google: { thinkingConfig: { thinkingLevel: "low" } },
      },
    });
    const cleaned = text.trim().replace(/^"|"$/g, "");
    if (cleaned.length >= 10 && cleaned.length <= 160) return cleaned;
    return canned;
  } catch {
    return canned;
  }
}
