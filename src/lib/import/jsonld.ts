import { stripTags } from "./html";
import { parseIngredientList } from "./ingredients";
import { categoryFrom, cuisineFrom } from "./taxonomy";
import type { ImportedStep, RecipeDraft } from "./types";

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasType(node: JsonObject, type: string): boolean {
  const t = node["@type"];
  const wanted = type.toLowerCase();
  const matches = (v: JsonValue) =>
    typeof v === "string" &&
    v.toLowerCase().replace(/^https?:\/\/schema\.org\//, "") === wanted;
  return Array.isArray(t) ? t.some(matches) : t !== undefined && matches(t);
}

function findRecipeNode(value: JsonValue, depth = 0): JsonObject | null {
  if (depth > 6) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipeNode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (!isObject(value)) return null;
  if (hasType(value, "Recipe")) return value;
  for (const key of [
    "@graph",
    "mainEntity",
    "mainEntityOfPage",
    "itemListElement",
    "item",
  ]) {
    const child = value[key];
    if (child !== undefined) {
      const found = findRecipeNode(child, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/** JSON.parse, then once more after the usual CMS mistakes. */
function parseLenient(raw: string): JsonValue | null {
  const body = raw
    .replace(/^\s*<!--|-->\s*$/g, "")
    .replace(/^\s*\/\*\s*<!\[CDATA\[\s*\*\/|\/\*\s*\]\]>\s*\*\/\s*$/g, "")
    .trim();
  try {
    return JSON.parse(body) as JsonValue;
  } catch {
    // Raw line breaks and tabs inside strings, trailing commas.
    const repaired = body
      .replace(/[\u0000-\u001f]+/g, " ")
      .replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(repaired) as JsonValue;
    } catch {
      return null;
    }
  }
}

/** Find the first schema.org/Recipe node in the page's ld+json blocks. */
export function extractRecipeJsonLd(html: string): JsonObject | null {
  const scripts = html.matchAll(
    /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of scripts) {
    const parsed = parseLenient(match[1] ?? "");
    const recipe = parsed === null ? null : findRecipeNode(parsed);
    if (recipe) return recipe;
  }
  return null;
}

/** "PT1H30M" / "P0DT20M" / "PT0H10M" → minutes. */
export function parseIsoDurationToMin(iso: unknown): number | null {
  if (typeof iso !== "string") return null;
  const match =
    /^P(?:(\d+)D)?T?(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+)S)?$/i.exec(
      iso.trim(),
    );
  if (!match || (!match[1] && !match[2] && !match[3] && !match[4])) return null;
  const minutes =
    (match[1] ? parseInt(match[1], 10) * 1440 : 0) +
    (match[2] ? parseFloat(match[2]) * 60 : 0) +
    (match[3] ? parseFloat(match[3]) : 0) +
    (match[4] ? parseInt(match[4], 10) / 60 : 0);
  return minutes > 0 ? Math.round(minutes) : null;
}

function firstString(value: JsonValue | undefined): string | null {
  if (typeof value === "string" && value.trim()) {
    const text = stripTags(value);
    return text.length > 0 ? text : null;
  }
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item);
      if (found) return found;
    }
    return null;
  }
  if (isObject(value)) {
    return firstString(value.name) ?? firstString(value["@value"]);
  }
  return null;
}

function allStrings(value: JsonValue | undefined): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => allStrings(item));
  const text = firstString(value);
  return text ? [text] : [];
}

/** Servings only when the yield counts people (« 20 crêpes » is not 20 guests). */
export function servingsFromYield(value: JsonValue | undefined): number | null {
  for (const text of allStrings(value)) {
    const people =
      /(\d{1,2})\s*(?:personnes?|pers\.?|parts?|portions?|couverts?|convives?|servings?|people)\b/i.exec(
        text,
      ) ?? /^\s*(?:pour\s+)?(\d{1,2})\s*$/i.exec(text);
    if (people) {
      const n = parseInt(people[1]!, 10);
      if (n >= 1 && n <= 24) return n;
    }
  }
  return null;
}

/**
 * The dish, without the site's SEO wording: « Recette tarte fine » → « Tarte
 * fine », « Crêpes : la meilleure recette rapide » → « Crêpes ».
 */
export function cleanRecipeTitle(raw: string): string {
  let title = raw.replace(/\s+/g, " ").trim();
  for (const separator of title.matchAll(/\s+[:|–—-]\s+/g)) {
    const at = separator.index ?? 0;
    const after = title.slice(at + separator[0].length);
    if (at >= 3 && /\b(recettes?|recipe)\b/i.test(after)) {
      title = title.slice(0, at);
      break;
    }
  }
  title = title
    .replace(
      /^recettes?\s+(?:de\s+la\s+|de\s+l['’]\s*|du\s+|des\s+|de\s+|d['’]\s*)?/i,
      "",
    )
    .trim();
  return title.length > 0
    ? title.charAt(0).toUpperCase() + title.slice(1)
    : raw.trim();
}

function parseKeywords(node: JsonObject): string[] {
  const keywords = node.keywords;
  const list = Array.isArray(keywords)
    ? keywords.map((k) => firstString(k))
    : typeof keywords === "string"
      ? keywords.split(",")
      : [];
  return list
    .map((k) => (k ?? "").toString().trim().toLowerCase())
    .filter((k) => k.length > 1 && k.length <= 30)
    .slice(0, 8);
}

/** « 1. Mélanger… 2. Cuire… » or one step per line, from a single text. */
function splitInstructionText(text: string): string[] {
  const byLines = text
    .split(/\r?\n|<br\s*\/?>/i)
    .map((line) => stripTags(line))
    .filter((line) => line.length > 2);
  if (byLines.length > 1) {
    return byLines.map((line) =>
      line.replace(/^\s*(?:[ée]tape\s*)?\d+\s*[).:–-]\s*/i, ""),
    );
  }
  const single = stripTags(text);
  const numbered = single.split(/\s(?=(?:[ée]tape\s*)?\d{1,2}\s*[).:]\s+\S)/i);
  if (numbered.length > 1) {
    return numbered
      .map((part) =>
        part.replace(/^\s*(?:[ée]tape\s*)?\d+\s*[).:]\s*/i, "").trim(),
      )
      .filter((part) => part.length > 2);
  }
  return single.length > 2 ? [single] : [];
}

function collectSteps(
  value: JsonValue | undefined,
  section: string | null,
  out: ImportedStep[],
): void {
  if (typeof value === "string") {
    for (const text of splitInstructionText(value)) {
      out.push({ text, durationMin: null, section });
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectSteps(item, section, out);
    return;
  }
  if (!isObject(value)) return;
  const list = value.itemListElement;
  const text = firstString(value.text);
  if (list !== undefined && !text) {
    // HowToSection (named phase), ItemList, HowToStep split in directions.
    const name = hasType(value, "HowToSection")
      ? firstString(value.name)
      : null;
    collectSteps(list, name ?? section, out);
    return;
  }
  const stepText = text ?? firstString(value.name);
  if (stepText && stepText.length > 2) {
    out.push({
      text: stepText,
      durationMin:
        parseIsoDurationToMin(value.totalTime) ??
        parseIsoDurationToMin(value.performTime),
      section,
    });
  }
}

function dedupeSteps(steps: ImportedStep[]): ImportedStep[] {
  return steps.filter(
    (step, index) => index === 0 || step.text !== steps[index - 1]!.text,
  );
}

/** Map a schema.org/Recipe node to our normalized draft (not reformulated). */
export function jsonLdToDraft(
  node: JsonObject,
  sourceUrl: string,
): RecipeDraft {
  const rawIngredients = node.recipeIngredient ?? node.ingredients;
  const ingredientLines = (
    Array.isArray(rawIngredients) ? rawIngredients : [rawIngredients]
  ).flatMap((line) => {
    const text = line === undefined ? null : firstString(line);
    return text ? [text] : [];
  });

  const steps: ImportedStep[] = [];
  collectSteps(node.recipeInstructions, null, steps);

  const cook =
    parseIsoDurationToMin(node.cookTime) ??
    (parseIsoDurationToMin(node.prepTime) === null
      ? parseIsoDurationToMin(node.totalTime)
      : null);

  return {
    title: cleanRecipeTitle(firstString(node.name) ?? "Recette importée"),
    description: firstString(node.description),
    servings: servingsFromYield(node.recipeYield),
    prepMin: parseIsoDurationToMin(node.prepTime),
    cookMin: cook,
    tags: parseKeywords(node),
    category: categoryFrom(allStrings(node.recipeCategory)),
    cuisine: cuisineFrom(allStrings(node.recipeCuisine)),
    ingredients: parseIngredientList(ingredientLines).slice(0, 30),
    steps: dedupeSteps(steps).slice(0, 25),
    sourceUrl,
    sourceAuthor: firstString(node.author),
    method: "structured",
    reformulated: false,
  };
}
