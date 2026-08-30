import type { ImportedIngredient } from "./types";

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
};

/** Units convertible to grams (liquids approximated at 1 g/ml, brief §4 style). */
const UNIT_TO_GRAMS: Array<[RegExp, number]> = [
  [/^(kg|kilos?|kilogrammes?)$/i, 1000],
  [/^(g|gr|grammes?)$/i, 1],
  [/^(l|litres?)$/i, 1000],
  [/^(cl)$/i, 10],
  [/^(ml)$/i, 1],
  [/^(c(?:\.|uill?[eè]res?)?\s*[àa]\s*s(?:oupe)?\.?|cas|c[àa]s)$/i, 15],
  [/^(c(?:\.|uill?[eè]res?)?\s*[àa]\s*c(?:af[ée])?\.?|cac|c[àa]c)$/i, 5],
];

const QTY_PATTERN =
  /^\s*(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?|[½⅓⅔¼¾])\s*(kilogrammes?|kilos?|kg|grammes?|gr|g|litres?|l|cl|ml|c(?:\.|uill?[eè]res?)?\s*[àa]\s*(?:s(?:oupe)?|c(?:af[ée])?)\.?|c[àa]s|cas|c[àa]c|cac)?\.?\s*(?:de\s+|d['’]\s*|du\s+|des\s+)?(.+)$/i;

function parseQty(raw: string): number {
  const unicode = UNICODE_FRACTIONS[raw];
  if (unicode !== undefined) return unicode;
  const fraction = raw.split("/");
  if (fraction.length === 2) {
    const [num, den] = fraction.map((p) => parseFloat(p.trim()));
    if (num && den) return num / den;
  }
  return parseFloat(raw.replace(",", "."));
}

/**
 * Parse one French ingredient line ("200 g de semoule fine", "2 càs d'huile",
 * "3 œufs"). When the unit converts to grams the label is the cleaned name;
 * otherwise the original quantity stays in the label so nothing is lost.
 */
export function parseIngredientLine(
  raw: string,
  section: string | null = null,
): ImportedIngredient {
  const line = raw
    .replace(/^\s*[-–—•*·]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  const match = QTY_PATTERN.exec(line);
  if (!match) {
    return { label: line, grams: null, section };
  }
  const [, rawQty, rawUnit, rest] = match;
  const qty = parseQty(rawQty);
  if (!Number.isFinite(qty) || qty <= 0 || !rest) {
    return { label: line, grams: null, section };
  }
  if (rawUnit) {
    for (const [pattern, factor] of UNIT_TO_GRAMS) {
      if (pattern.test(rawUnit.trim())) {
        const grams = Math.round(qty * factor * 10) / 10;
        return { label: rest.trim(), grams, section };
      }
    }
  }
  // Countable item ("3 œufs", "2 oignons") — keep the count in the label.
  return { label: line, grams: null, section };
}
