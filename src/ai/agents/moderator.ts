import "server-only";

import { generateObject } from "ai";
import { z } from "zod";

import { pickModel } from "@/ai/provider";
import { moderateText, type ModerationVerdict } from "@/lib/moderation/filter";

const verdictSchema = z.object({
  allow: z.boolean(),
  reasons: z
    .array(
      z.enum([
        "haine_ou_harcelement",
        "pro_tca",
        "medical_dangereux",
        "contenu_sensible",
      ]),
    )
    .max(4),
  severity: z.enum(["none", "medium", "high"]),
});

const SYSTEM = `Tu modères la communauté bienveillante d'une app de nutrition familiale.
Tu bloques uniquement (severity=high, allow=false) : haine ou harcèlement, apologie des troubles alimentaires (pro-ana, restrictions extrêmes, purge), conseils médicaux dangereux (arrêt de traitement, produits dopants, remèdes miracles).
Tu signales sans bloquer (severity=medium, allow=true) : détresse corporelle, promesses minceur douteuses.
Tout le reste passe (severity=none). L'humour, la critique culinaire, la religion et le jeûne religieux sont normaux ici. Réponds uniquement dans la structure demandée.`;

/**
 * Full moderation pipeline: the rules pre-filter always runs (its block is
 * final); the AI refines when a key is configured, catching phrasing the
 * rules miss. Merged verdict keeps the harshest outcome.
 */
export async function runModeration(text: string): Promise<ModerationVerdict> {
  const heuristic = moderateText(text);
  if (!heuristic.allow) return heuristic;

  const picked = pickModel("light");
  if (!picked) return heuristic;

  try {
    const { object } = await generateObject({
      model: picked.model,
      schema: verdictSchema,
      system: SYSTEM,
      prompt: text.slice(0, 2000),
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(10_000),
    });
    const reasons = [...new Set([...heuristic.reasons, ...object.reasons])];
    if (!object.allow || object.severity === "high") {
      return { allow: false, reasons, severity: "high" };
    }
    if (object.severity === "medium" || heuristic.severity === "medium") {
      return { allow: true, reasons, severity: "medium" };
    }
    return { allow: true, reasons, severity: "none" };
  } catch (error) {
    console.error("moderation agent failed", error);
    return heuristic;
  }
}
