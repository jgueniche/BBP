import { decodeEntities, stripTags } from "./html";
import { parseIngredientList } from "./ingredients";
import {
  cleanRecipeTitle,
  parseIsoDurationToMin,
  servingsFromYield,
} from "./jsonld";
import { categoryFrom, cuisineFrom } from "./taxonomy";
import type { ImportedStep, RecipeDraft } from "./types";

// Older sites and blogs describe the recipe with schema.org microdata
// (itemprop="recipeIngredient"…) instead of JSON-LD.

const RECIPE_SCOPE =
  /itemtype\s*=\s*["']https?:\/\/(?:www\.)?schema\.org\/Recipe["']/i;

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(
    `\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  ).exec(tag);
  return match ? decodeEntities(match[2] ?? match[3] ?? match[4] ?? "") : null;
}

/** Inner HTML of the element opened at `from` (nested same tags counted). */
function innerHtml(html: string, from: number, tagName: string): string {
  const openEnd = html.indexOf(">", from);
  if (openEnd === -1) return "";
  const pattern = new RegExp(`<(/?)${tagName}\\b[^>]*>`, "gi");
  pattern.lastIndex = openEnd + 1;
  let depth = 1;
  for (let match = pattern.exec(html); match; match = pattern.exec(html)) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return html.slice(openEnd + 1, match.index);
  }
  return html.slice(openEnd + 1, openEnd + 5_000);
}

const VOID_TAGS = new Set([
  "meta",
  "link",
  "img",
  "input",
  "br",
  "hr",
  "source",
]);

/** Every value of an item property, in page order (raw HTML for elements). */
function propertyValues(scope: string, property: string): string[] {
  const values: string[] = [];
  const tags = scope.matchAll(
    /<([a-z][a-z0-9]*)\b[^>]*\bitemprop\s*=\s*["']([^"']+)["'][^>]*>/gi,
  );
  for (const tag of tags) {
    const names = tag[2]!.toLowerCase().split(/\s+/);
    if (!names.includes(property.toLowerCase())) continue;
    const element = tag[0];
    const tagName = tag[1]!.toLowerCase();
    const direct =
      attribute(element, "content") ??
      attribute(element, "datetime") ??
      (tagName === "link" ? attribute(element, "href") : null);
    if (direct !== null) {
      values.push(direct);
    } else if (!VOID_TAGS.has(tagName)) {
      values.push(innerHtml(scope, tag.index ?? 0, tagName));
    }
  }
  return values;
}

function stepsFrom(fragments: string[]): ImportedStep[] {
  const steps: ImportedStep[] = [];
  for (const fragment of fragments) {
    const parts = /<(li|p)\b/i.test(fragment)
      ? fragment.split(/<\/?(?:li|p|br)\b[^>]*>/i)
      : fragment.split(/<br\s*\/?>|\n/i);
    for (const part of parts) {
      const text = stripTags(part).replace(
        /^\s*(?:[ée]tape\s*)?\d+\s*[).:–-]\s*/i,
        "",
      );
      if (text.length > 2)
        steps.push({ text, durationMin: null, section: null });
    }
  }
  return steps;
}

export function microdataToDraft(
  html: string,
  sourceUrl: string,
): RecipeDraft | null {
  const start = html.search(RECIPE_SCOPE);
  if (start === -1) return null;
  const scope = html.slice(start, start + 400_000);
  const first = (property: string) => {
    const value = propertyValues(scope, property)[0];
    const text = value === undefined ? "" : stripTags(value);
    return text.length > 0 ? text : null;
  };
  const texts = (property: string) =>
    propertyValues(scope, property)
      .map((value) => stripTags(value))
      .filter((value) => value.length > 0);

  const ingredients = parseIngredientList([
    ...texts("recipeIngredient"),
    ...texts("ingredients"),
  ]);
  const steps = stepsFrom(propertyValues(scope, "recipeInstructions"));
  if (ingredients.length === 0 && steps.length === 0) return null;

  const prep = parseIsoDurationToMin(first("prepTime"));
  return {
    title: cleanRecipeTitle(first("name") ?? "Recette importée"),
    description: first("description"),
    servings: servingsFromYield(first("recipeYield") ?? undefined),
    prepMin: prep,
    cookMin:
      parseIsoDurationToMin(first("cookTime")) ??
      (prep === null ? parseIsoDurationToMin(first("totalTime")) : null),
    tags: [],
    category: categoryFrom(texts("recipeCategory")),
    cuisine: cuisineFrom(texts("recipeCuisine")),
    ingredients: ingredients.slice(0, 30),
    steps: steps.slice(0, 25),
    sourceUrl,
    sourceAuthor: null,
    method: "structured",
    reformulated: false,
  };
}
