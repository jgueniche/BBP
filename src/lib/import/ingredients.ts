import type { ImportedIngredient } from "./types";

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅛": 0.125,
};

const WORD_NUMBERS: Record<string, number> = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  douze: 12,
  quinze: 15,
  vingt: 20,
  demi: 0.5,
  demie: 0.5,
};

// « 1/2 », « 1 1/2 », « 1 ½ », « 1,5 », « ½ ».
const DIGITS =
  /^(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?(?:\s+\d+\s*\/\s*\d+|\s*[½⅓⅔¼¾⅛])?|[½⅓⅔¼¾⅛])/;
const WORDS =
  /^((?:un|une)\s+demie?|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|douze|quinze|vingt|demie?)(?=[\s-])/i;
// « 2 à 3 », « 2-3 », « 2 ou 3 »: the first amount is kept.
const RANGE_TAIL =
  /^\s*(?:à|a|-|–|ou)\s*(?:\d+(?:[.,]\d+)?|[½⅓⅔¼¾]|un|une|deux|trois|quatre|cinq|six)\b/i;

type Unit =
  | "kg"
  | "g"
  | "dl"
  | "cl"
  | "ml"
  | "l"
  | "cas"
  | "cac"
  | "pincee"
  | "verre"
  | "tasse"
  | "sachet"
  | "noix";

const SPOON = String.raw`(?:cuill?[eè]res?|cuiller[ée]es?|cuil\.?|c\.?)\s*(?:[àa]\s*)?\.?\s*`;

const UNITS: ReadonlyArray<readonly [RegExp, Unit]> = [
  [/^(?:kilogrammes?|kilos?|kg)(?![a-zà-ÿ])\.?/i, "kg"],
  [/^(?:grammes?|gr\.?|g)(?![a-zà-ÿ])/i, "g"],
  [/^(?:d[ée]cilitres?|dl)(?![a-zà-ÿ])/i, "dl"],
  [/^(?:centilitres?|cl)(?![a-zà-ÿ])/i, "cl"],
  [/^(?:millilitres?|ml)(?![a-zà-ÿ])/i, "ml"],
  [/^(?:litres?|l)(?![a-zà-ÿ'’])/i, "l"],
  [new RegExp(`^${SPOON}(?:soupe|s)(?![a-zà-ÿ])\\.?`, "i"), "cas"],
  [new RegExp(`^${SPOON}(?:caf[ée]|th[ée]|c)(?![a-zà-ÿ])\\.?`, "i"), "cac"],
  [/^(?:c[àa]s|cs)(?![a-zà-ÿ])\.?/i, "cas"],
  [/^(?:c[àa]c|cc)(?![a-zà-ÿ])\.?/i, "cac"],
  [/^pinc[ée]es?(?![a-zà-ÿ])/i, "pincee"],
  [/^verres?(?![a-zà-ÿ])/i, "verre"],
  [/^tasses?(?![a-zà-ÿ])/i, "tasse"],
  [/^sachets?(?![a-zà-ÿ])/i, "sachet"],
  [/^noix(?=\s+de\s+beurre)/i, "noix"],
];

/** Grams per unit (liquids at 1 g/ml, spoons 15 and 5 g, a glass 20 cl). */
const GRAMS: Record<Exclude<Unit, "sachet">, number> = {
  kg: 1000,
  g: 1,
  dl: 100,
  cl: 10,
  ml: 1,
  l: 1000,
  cas: 15,
  cac: 5,
  pincee: 0.5,
  verre: 200,
  tasse: 250,
  noix: 10,
};

function sachetGrams(label: string): number | null {
  if (/levure chimique|poudre [àa] lever/i.test(label)) return 11;
  if (/sucre vanill/i.test(label)) return 7.5;
  if (/levure (?:s[eè]che|de boulanger|boulang)/i.test(label)) return 5.5;
  return null;
}

function parseAmount(raw: string): number {
  const text = raw.trim().toLowerCase();
  if (/^(?:un|une)\s+demie?$/.test(text)) return 0.5;
  const word = WORD_NUMBERS[text];
  if (word !== undefined) return word;
  const unicode = /^(\d+)?\s*([½⅓⅔¼¾⅛])$/.exec(text);
  if (unicode) {
    return (
      (unicode[1] ? parseInt(unicode[1], 10) : 0) +
      UNICODE_FRACTIONS[unicode[2]!]!
    );
  }
  const mixed = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(text);
  if (mixed) {
    const [, whole, num, den] = mixed;
    return parseInt(whole!, 10) + parseInt(num!, 10) / parseInt(den!, 10);
  }
  const fraction = /^(\d+)\s*\/\s*(\d+)$/.exec(text);
  if (fraction) return parseInt(fraction[1]!, 10) / parseInt(fraction[2]!, 10);
  return parseFloat(text.replace(",", "."));
}

const MODIFIERS =
  /^(?:\s*(?:rases?|bomb[ée]es?|bien pleines?|pleines?|environ|g[ée]n[ée]reuses?|\([^)]*\)))+/i;
const LINKING = /^\s*(?:de la\s+|de l['’]\s*|de\s+|d['’]\s*|du\s+|des\s+)/i;

function cleanLine(raw: string): string {
  return raw
    .replace(/^\s*[-–—•*·▪✓✔✅]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse one French ingredient line (« 200 g de semoule fine », « 2 c. à s.
 * d'huile », « une pincée de sel », « 3 œufs »). When the unit converts to
 * grams the label is the ingredient's name; otherwise the whole line stays
 * the label so nothing is lost.
 */
export function parseIngredientLine(
  raw: string,
  section: string | null = null,
): ImportedIngredient {
  const line = cleanLine(raw);
  // « 1 kg 500 de pommes » is 1,5 kg.
  const kilosAndGrams =
    /^(\d+)\s*kg\s*(\d{3})\s+(?:de\s+|d['’]\s*)?(.+)$/i.exec(line);
  if (kilosAndGrams) {
    return {
      label: kilosAndGrams[3]!.trim(),
      grams:
        parseInt(kilosAndGrams[1]!, 10) * 1000 +
        parseInt(kilosAndGrams[2]!, 10),
      section,
    };
  }
  const amountMatch = DIGITS.exec(line) ?? WORDS.exec(line);
  if (!amountMatch) return { label: line, grams: null, section };
  const qty = parseAmount(amountMatch[1]!);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { label: line, grams: null, section };
  }
  let rest = line.slice(amountMatch[0].length);
  rest = rest
    .replace(RANGE_TAIL, "")
    .replace(/^\s*-\s*/, "")
    .trimStart();

  for (const [pattern, unit] of UNITS) {
    const unitMatch = pattern.exec(rest);
    if (!unitMatch) continue;
    const label = rest
      .slice(unitMatch[0].length)
      .replace(MODIFIERS, "")
      .replace(LINKING, "")
      .trim();
    if (label.length === 0) break;
    const perUnit = unit === "sachet" ? sachetGrams(label) : GRAMS[unit];
    if (perUnit === null) break;
    return {
      label,
      grams: Math.round(qty * perUnit * 10) / 10,
      section,
    };
  }
  // Countable item (« 3 œufs », « 2 gousses d'ail »): the count stays in the label.
  return { label: line, grams: null, section };
}

const SECTION_WORDS =
  /^(?:pour (?:la|le|les|l['’]|un|une|des)\b.*|pr[ée]paration|garniture|d[ée]coration|dressage|finition|marinade|p[âa]te|gla[çc]age|sirop|farce|ganache|topping|montage|streusel|crumble|coulis|la sauce|la p[âa]te|la cr[èe]me|la garniture)\s*:?$/i;

/**
 * A heading slipped into an ingredient list (« Pour la pâte : »,
 * « Préparation ») rather than an ingredient: it names the next section.
 */
export function sectionHeader(raw: string): string | null {
  const text = cleanLine(raw);
  if (text.length === 0 || text.length > 60 || /\d/.test(text)) return null;
  if (!text.endsWith(":") && !SECTION_WORDS.test(text)) return null;
  const name = text.replace(/\s*:\s*$/, "").trim();
  return name.length > 0 ? name.charAt(0).toUpperCase() + name.slice(1) : null;
}

/** Ingredient lines with their headings turned into sections. */
export function parseIngredientList(lines: string[]): ImportedIngredient[] {
  const out: ImportedIngredient[] = [];
  let section: string | null = null;
  for (const line of lines) {
    const header = sectionHeader(line);
    if (header) {
      section = header;
      continue;
    }
    const cleaned = cleanLine(line);
    if (cleaned.length < 2) continue;
    out.push(parseIngredientLine(cleaned, section));
  }
  return out;
}
