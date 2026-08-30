import { parseIngredientLine } from "./ingredients";
import type { ImportedStep, RecipeDraft } from "./types";

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type JsonObject = { [key: string]: JsonValue };

function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function hasType(node: JsonObject, type: string): boolean {
  const t = node["@type"];
  if (typeof t === "string") return t.toLowerCase() === type.toLowerCase();
  if (Array.isArray(t)) {
    return t.some(
      (v) => typeof v === "string" && v.toLowerCase() === type.toLowerCase(),
    );
  }
  return false;
}

function findRecipeNode(value: JsonValue): JsonObject | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (!isObject(value)) return null;
  if (hasType(value, "Recipe")) return value;
  const graph = value["@graph"];
  if (graph) return findRecipeNode(graph);
  return null;
}

/** Find the first schema.org/Recipe node in the page's ld+json blocks. */
export function extractRecipeJsonLd(html: string): JsonObject | null {
  const scripts = html.matchAll(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1]) as JsonValue;
      const recipe = findRecipeNode(parsed);
      if (recipe) return recipe;
    } catch {
      // Malformed JSON-LD block — skip it.
    }
  }
  return null;
}

/** "PT1H30M" / "P0DT20M" → minutes. */
export function parseIsoDurationToMin(iso: unknown): number | null {
  if (typeof iso !== "string") return null;
  const match =
    /^P(?:\d+D)?T?(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+)S)?$/i.exec(
      iso.trim(),
    );
  if (!match || (!match[1] && !match[2] && !match[3])) return null;
  const minutes =
    (match[1] ? parseFloat(match[1]) * 60 : 0) +
    (match[2] ? parseFloat(match[2]) : 0) +
    (match[3] ? parseInt(match[3], 10) / 60 : 0);
  return minutes > 0 ? Math.round(minutes) : null;
}

function firstString(value: JsonValue | undefined): string | null {
  if (typeof value === "string" && value.trim()) return stripHtml(value);
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

function parseServings(value: JsonValue | undefined): number | null {
  const text = firstString(value);
  if (!text) return null;
  const match = /(\d+)/.exec(text);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return n >= 1 && n <= 50 ? n : null;
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

function collectSteps(
  value: JsonValue | undefined,
  section: string | null,
  out: ImportedStep[],
): void {
  if (typeof value === "string") {
    const text = stripHtml(value);
    if (text.length > 2) out.push({ text, durationMin: null, section });
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectSteps(item, section, out);
    return;
  }
  if (!isObject(value)) return;
  if (hasType(value, "HowToSection")) {
    const name = firstString(value.name);
    collectSteps(value.itemListElement, name ?? section, out);
    return;
  }
  const text = firstString(value.text) ?? firstString(value.name);
  if (text && text.length > 2) {
    out.push({
      text,
      durationMin:
        parseIsoDurationToMin(value.totalTime) ??
        parseIsoDurationToMin(value.performTime),
      section,
    });
  }
}

/** Map a schema.org/Recipe node to our normalized draft. */
export function jsonLdToDraft(
  node: JsonObject,
  sourceUrl: string,
): RecipeDraft {
  const rawIngredients = node.recipeIngredient ?? node.ingredients;
  const ingredientLines = (
    Array.isArray(rawIngredients) ? rawIngredients : []
  ).flatMap((line) => {
    const text = firstString(line);
    return text ? [text] : [];
  });

  const steps: ImportedStep[] = [];
  collectSteps(node.recipeInstructions, null, steps);

  return {
    title: firstString(node.name) ?? "Recette importée",
    description: firstString(node.description),
    servings: parseServings(node.recipeYield),
    prepMin: parseIsoDurationToMin(node.prepTime),
    cookMin:
      parseIsoDurationToMin(node.cookTime) ??
      parseIsoDurationToMin(node.totalTime),
    tags: parseKeywords(node),
    ingredients: ingredientLines.map((line) => parseIngredientLine(line)),
    steps: steps.slice(0, 25),
    sourceUrl,
    sourceAuthor: firstString(node.author),
    method: "structured",
  };
}
