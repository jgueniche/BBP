import { parseIngredientLine } from "./ingredients";
import type { ImportedIngredient, ImportedStep, RecipeDraft } from "./types";

const INGREDIENT_MARKER = /ingr[ée]dients?\s*:?\s*$/i;
const STEP_MARKER =
  /^(pr[ée]paration|instructions?|[ée]tapes?|recette|d[ée]roul[ée]|marche à suivre)\s*:?\s*$/i;
const BULLET = /^\s*[-–—•*·✅✔️▪️]\s*/;
const NUMBERED = /^\s*(?:[ée]tape\s*)?\d+\s*[).:‑-]\s*/i;
const QTY_START = /^\s*(\d|[½⅓⅔¼¾])/;

function cleanLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

/**
 * No-AI fallback: split a pasted caption or free text into a recipe draft.
 * Marker lines ("Ingrédients", "Préparation") switch modes; bulleted or
 * quantity-looking lines count as ingredients, numbered lines as steps.
 */
export function heuristicDraftFromText(
  raw: string,
  base: Partial<RecipeDraft> = {},
): RecipeDraft {
  const lines = raw
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((line) => line.length > 0);

  const ingredients: ImportedIngredient[] = [];
  const steps: ImportedStep[] = [];
  let mode: "intro" | "ingredients" | "steps" = "intro";
  let title = base.title ?? null;
  const descriptionParts: string[] = [];

  for (const line of lines) {
    if (INGREDIENT_MARKER.test(line)) {
      mode = "ingredients";
      continue;
    }
    if (STEP_MARKER.test(line)) {
      mode = "steps";
      continue;
    }
    const bulleted = BULLET.test(line);
    const numbered = NUMBERED.test(line);
    const stripped = line.replace(BULLET, "").replace(NUMBERED, "").trim();
    if (stripped.length < 2) continue;
    // Metadata lines (times, hashtag rows) are handled by the regexes below.
    if (
      /^#/.test(stripped) ||
      /^(cuisson|pr[ée]paration|repos|total)\s*:/i.test(stripped)
    ) {
      continue;
    }

    if (numbered || (mode === "steps" && stripped.length > 12)) {
      steps.push({ text: stripped, durationMin: null, section: null });
      continue;
    }
    if (mode === "ingredients" || (bulleted && QTY_START.test(stripped))) {
      ingredients.push(parseIngredientLine(stripped));
      continue;
    }
    if (mode === "intro") {
      if (!title && stripped.length <= 90) {
        title = stripped.replace(/[#@]\w+/g, "").trim() || stripped;
      } else if (descriptionParts.length < 2 && !stripped.startsWith("#")) {
        descriptionParts.push(stripped);
      }
    }
  }

  const hashtags = [...raw.matchAll(/#([\p{L}\d_]{2,30})/gu)]
    .map((m) => m[1].toLowerCase())
    .slice(0, 8);
  const servingsMatch = /pour\s+(\d{1,2})\s+personnes?/i.exec(raw);
  const cookMatch = /cuisson\s*:?\s*(\d{1,3})\s*min/i.exec(raw);
  const prepMatch = /pr[ée]paration\s*:?\s*(\d{1,3})\s*min/i.exec(raw);

  return {
    title: title ?? "Recette importée",
    description:
      base.description ??
      (descriptionParts.length > 0 ? descriptionParts.join(" ") : null),
    servings:
      base.servings ?? (servingsMatch ? parseInt(servingsMatch[1], 10) : null),
    prepMin: base.prepMin ?? (prepMatch ? parseInt(prepMatch[1], 10) : null),
    cookMin: base.cookMin ?? (cookMatch ? parseInt(cookMatch[1], 10) : null),
    tags: base.tags && base.tags.length > 0 ? base.tags : hashtags,
    ingredients,
    steps: steps.slice(0, 25),
    sourceUrl: base.sourceUrl ?? null,
    sourceAuthor: base.sourceAuthor ?? null,
    method: "heuristic",
  };
}
