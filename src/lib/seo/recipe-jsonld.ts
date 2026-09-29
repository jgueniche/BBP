import { fr } from "@/i18n/fr";
import type { Totals } from "@/lib/nutrition/items";

// schema.org/Recipe for the public share page (brief §10.14 — SEO of public
// recipes). Pure so it can be unit tested; the page injects the JSON.

export type RecipeForSeo = {
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  origin: string | null;
  category: string | null;
  prep_min: number | null;
  cook_min: number | null;
  servings: number;
  source_author: string | null;
  source_url: string | null;
  tags: string[];
  nutrition_per_serving: Totals;
  created_at?: string;
  updated_at?: string;
  ingredients: Array<{ label_raw: string; section: string | null }>;
  steps: Array<{
    text: string;
    duration_sec: number | null;
    section: string | null;
  }>;
};

/** ISO 8601 duration for a number of minutes ("PT1H15M"). */
export function isoDuration(minutes: number | null): string | undefined {
  if (minutes === null || !Number.isFinite(minutes) || minutes <= 0) {
    return undefined;
  }
  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return `PT${hours > 0 ? `${hours}H` : ""}${rest > 0 || hours === 0 ? `${rest}M` : ""}`;
}

/** French label of a stored cuisine or category key (raw key if unknown). */
function labelOf(
  labels: Readonly<Record<string, string>>,
  key: string | null,
): string | null {
  if (!key) return null;
  return labels[key] ?? key;
}

function nutritionInfo(totals: Totals): Record<string, string> | undefined {
  const info: Record<string, string> = {
    "@type": "NutritionInformation",
  };
  const grams = (value: number | undefined) =>
    typeof value === "number" ? `${Math.round(value * 10) / 10} g` : undefined;
  const fields: Array<[string, string | undefined]> = [
    [
      "calories",
      typeof totals.kcal === "number"
        ? `${Math.round(totals.kcal)} kcal`
        : undefined,
    ],
    ["proteinContent", grams(totals.protein_g)],
    ["carbohydrateContent", grams(totals.carb_g)],
    ["fatContent", grams(totals.fat_g)],
    ["fiberContent", grams(totals.fiber_g)],
    ["sugarContent", grams(totals.sugars_g)],
    ["saturatedFatContent", grams(totals.satfat_g)],
    [
      "sodiumContent",
      typeof totals.sodium_mg === "number"
        ? `${Math.round(totals.sodium_mg)} mg`
        : undefined,
    ],
  ];
  let filled = 0;
  for (const [key, value] of fields) {
    if (value !== undefined) {
      info[key] = value;
      filled += 1;
    }
  }
  return filled > 0 ? info : undefined;
}

export function recipeJsonLd(
  recipe: RecipeForSeo,
  options: { siteUrl: string },
): Record<string, unknown> {
  const base = options.siteUrl.replace(/\/+$/, "");
  const url = `${base}/r/${recipe.slug}`;
  const total =
    recipe.prep_min === null && recipe.cook_min === null
      ? null
      : (recipe.prep_min ?? 0) + (recipe.cook_min ?? 0);
  const cuisine = labelOf(fr.recettes.origins, recipe.origin);
  const category = labelOf(fr.recettes.categories, recipe.category);
  const keywords = [...recipe.tags, cuisine].filter(
    (k): k is string => typeof k === "string" && k.length > 0,
  );

  const json: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "@id": url,
    url,
    name: recipe.title,
    inLanguage: "fr",
    image: [`${base}/api/og/recette/${recipe.slug}`],
    author: recipe.source_author
      ? { "@type": "Person", name: recipe.source_author }
      : { "@type": "Organization", name: fr.app.name, url: base },
    publisher: { "@type": "Organization", name: fr.app.name, url: base },
    recipeYield: `${recipe.servings} ${fr.recettes.servings}`,
  };
  if (recipe.description) json.description = recipe.description;
  if (recipe.created_at) json.datePublished = recipe.created_at;
  if (recipe.updated_at) json.dateModified = recipe.updated_at;
  if (recipe.source_url) json.isBasedOn = recipe.source_url;
  if (category) json.recipeCategory = category;
  if (cuisine) json.recipeCuisine = cuisine;
  if (keywords.length > 0) json.keywords = keywords.join(", ");

  const prep = isoDuration(recipe.prep_min);
  const cook = isoDuration(recipe.cook_min);
  const totalIso = isoDuration(total);
  if (prep) json.prepTime = prep;
  if (cook) json.cookTime = cook;
  if (totalIso) json.totalTime = totalIso;

  if (recipe.ingredients.length > 0) {
    json.recipeIngredient = recipe.ingredients.map((i) => i.label_raw);
  }
  if (recipe.steps.length > 0) {
    json.recipeInstructions = recipe.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      text: step.text,
      ...(step.section ? { name: step.section } : {}),
    }));
  }
  const nutrition = nutritionInfo(recipe.nutrition_per_serving);
  if (nutrition) json.nutrition = nutrition;
  return json;
}
