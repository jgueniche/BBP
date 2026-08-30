import type { KashrutClass } from "./meal";

export type IngredientForClassification = {
  label: string;
  foodClass: KashrutClass | null;
  foodIsFish?: boolean;
  foodHint?: string | null;
};

export type RecipeClassification = {
  kashrutClass: KashrutClass | null;
  isFish: boolean;
  confidence: number;
  flags: string[];
};

const MEAT_WORDS = [
  "boeuf",
  "bœuf",
  "veau",
  "agneau",
  "mouton",
  "poulet",
  "dinde",
  "volaille",
  "canard",
  "pintade",
  "merguez",
  "kefta",
  "viande",
  "poule",
  "foie",
];
const DAIRY_WORDS = [
  "lait",
  "beurre",
  "crème",
  "creme",
  "fromage",
  "feta",
  "yaourt",
  "emmental",
  "parmesan",
  "mozzarella",
  "ricotta",
  "labneh",
];
const DAIRY_EXCEPTIONS = [
  "lait de coco",
  "lait d'amande",
  "lait de soja",
  "lait d'avoine",
  "lait de riz",
  "crème de marron",
  "crème de sésame",
  "beurre de cacahuète",
  "beurre de cacao",
];
const FISH_WORDS = [
  "poisson",
  "thon",
  "cabillaud",
  "merlan",
  "dorade",
  "daurade",
  "sardine",
  "saumon",
  "mérou",
  "merou",
  "loup",
  "mulet",
  "boutargue",
  "anchois",
  "maquereau",
];
const NON_KOSHER_WORDS = [
  "porc",
  "lard",
  "bacon",
  "jambon",
  "crevette",
  "moule",
  "calamar",
  "poulpe",
  "huître",
  "huitre",
  "crabe",
  "homard",
  "escargot",
  "gambas",
  "seiche",
  "anguille",
  "espadon",
  "gélatine",
  "gelatine",
];

function hasWord(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((word) =>
    new RegExp(`(^|[^\\p{L}])${word}`, "u").test(lower),
  );
}

/**
 * Rule-based recipe classification (brief §5). Linked food classes win;
 * free-text labels fall back to keyword rules. Confidence drops with
 * unresolved ingredients; below 0.8 the LLM checker is consulted.
 */
export function classifyRecipe(
  ingredients: IngredientForClassification[],
): RecipeClassification {
  const flags: string[] = [];
  let hasMeat = false;
  let hasDairy = false;
  let hasFish = false;
  let unknowns = 0;

  for (const ingredient of ingredients) {
    const label = ingredient.label;

    if (hasWord(label, NON_KOSHER_WORDS)) {
      flags.push(`ingrédient à vérifier : ${label}`);
    }
    if (ingredient.foodHint?.startsWith("non casher")) {
      flags.push(`${label} : ${ingredient.foodHint}`);
    }

    if (ingredient.foodClass === "bassari") hasMeat = true;
    else if (ingredient.foodClass === "halavi") hasDairy = true;
    else if (ingredient.foodClass === "parve") {
      if (ingredient.foodIsFish) hasFish = true;
    } else {
      const isDairyException = DAIRY_EXCEPTIONS.some((exception) =>
        label.toLowerCase().includes(exception),
      );
      if (hasWord(label, MEAT_WORDS)) hasMeat = true;
      else if (!isDairyException && hasWord(label, DAIRY_WORDS))
        hasDairy = true;
      else if (hasWord(label, FISH_WORDS)) hasFish = true;
      else unknowns += 1;
    }
  }

  if (hasMeat && hasDairy) {
    flags.push("mélange viande + lait détecté");
  }
  if (hasMeat && hasFish) {
    flags.push("poisson + viande dans la même recette (minhag)");
  }

  const kashrutClass: KashrutClass | null =
    hasMeat && hasDairy
      ? null
      : hasMeat
        ? "bassari"
        : hasDairy
          ? "halavi"
          : "parve";

  let confidence = 1;
  if (ingredients.length > 0) {
    confidence -= (unknowns / ingredients.length) * 0.5;
  }
  if (flags.length > 0) confidence -= 0.25;
  confidence = Math.max(0.2, Math.round(confidence * 100) / 100);

  return {
    kashrutClass,
    isFish: hasFish && !hasMeat,
    confidence,
    flags,
  };
}
