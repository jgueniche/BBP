/**
 * Simple cooking rules (ADR-031/032): opt-in diets, the 14 EU allergens and
 * free « je n'aime pas » words. Ingredients are described with neutral
 * attributes; the rules turn them into a per-recipe verdict.
 */
export const DIETS = [
  "vegetarian",
  "vegan",
  "pescatarian",
  "no_pork",
  "no_alcohol",
  "halal",
  "kosher",
  "gluten_free",
  "lactose_free",
] as const;
export type Diet = (typeof DIETS)[number];

/** EU Regulation 1169/2011, Annex II. */
export const ALLERGENS = [
  "gluten",
  "crustaceans",
  "eggs",
  "fish",
  "peanuts",
  "soy",
  "milk",
  "tree_nuts",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
  "lupin",
  "molluscs",
] as const;
export type Allergen = (typeof ALLERGENS)[number];

/** Neutral facts about an ingredient — never a religious class. */
export const ATTRIBUTES = [
  "meat",
  "pork",
  "rabbit",
  "horse",
  "blood",
  "fish",
  "scaleless_fish",
  "crustacean",
  "mollusc",
  "dairy",
  "cheese",
  "low_lactose",
  "lactose_free",
  "animal_rennet",
  "egg",
  "honey",
  "gelatin",
  "carmine",
  "alcohol",
  "grape",
  "gluten",
  "halal_label",
  "kosher_label",
] as const;
export type Attribute = (typeof ATTRIBUTES)[number];

export type IngredientAnalysis = {
  attributes: ReadonlySet<Attribute>;
  /** Possibly present (composite products, unknown origin). */
  maybe: ReadonlySet<Attribute>;
  allergens: ReadonlySet<Allergen>;
  maybeAllergens: ReadonlySet<Allergen>;
};

export type FoodRules = {
  diets: readonly Diet[];
  allergens: readonly Allergen[];
  dislikes: readonly string[];
};

export const NO_RULES: FoodRules = { diets: [], allergens: [], dislikes: [] };

export function hasRules(rules: FoodRules | null | undefined): boolean {
  return (
    !!rules &&
    rules.diets.length + rules.allergens.length + rules.dislikes.length > 0
  );
}

/** Union of several people's rules (me, household, guests). */
export function combineRules(list: readonly FoodRules[]): FoodRules {
  return {
    diets: [...new Set(list.flatMap((r) => r.diets))],
    allergens: [...new Set(list.flatMap((r) => r.allergens))],
    dislikes: [...new Set(list.flatMap((r) => r.dislikes))],
  };
}

export type EngineIngredient = {
  label: string;
  /** Name of the linked reference food (Ciqual), when any. */
  foodName?: string | null;
  grams?: number | null;
};
