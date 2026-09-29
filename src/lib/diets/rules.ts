import type {
  Allergen,
  Attribute,
  Diet,
  FoodRules,
  IngredientAnalysis,
} from "./types";
import { normalize } from "./ingredients";

export type Level = "conflict" | "verify";

/** Why an ingredient does not suit a rule; rendered in French by the UI. */
export type Cause =
  | {
      kind: "diet";
      diet: Diet;
      code: Attribute | "meat_with_dairy";
      level: Level;
    }
  | { kind: "allergen"; allergen: Allergen; level: Level }
  | { kind: "dislike"; word: string; level: "conflict" };

type DietRule = {
  conflict: Attribute[];
  verify?: Attribute[];
  /** Possibly present → à vérifier. */
  maybe?: Attribute[];
};

const LAND_FLESH: Attribute[] = ["meat", "pork", "rabbit", "horse", "blood"];
const SEA_FLESH: Attribute[] = [
  "fish",
  "scaleless_fish",
  "crustacean",
  "mollusc",
];

export const DIET_RULES: Record<Diet, DietRule> = {
  vegetarian: {
    conflict: [...LAND_FLESH, ...SEA_FLESH, "gelatin", "carmine"],
    maybe: ["meat", "pork", "fish", "crustacean"],
  },
  vegan: {
    conflict: [
      ...LAND_FLESH,
      ...SEA_FLESH,
      "gelatin",
      "carmine",
      "dairy",
      "egg",
      "honey",
    ],
    maybe: ["meat", "pork", "fish", "crustacean", "dairy", "egg"],
  },
  pescatarian: {
    conflict: LAND_FLESH,
    verify: ["gelatin"],
    maybe: ["meat", "pork"],
  },
  no_pork: { conflict: ["pork"], verify: ["gelatin"], maybe: ["pork"] },
  no_alcohol: { conflict: ["alcohol"], maybe: ["alcohol"] },
  halal: {
    conflict: ["pork", "blood", "alcohol"],
    verify: ["gelatin", "carmine"],
    maybe: ["pork", "alcohol", "meat"],
  },
  kosher: {
    conflict: [
      "pork",
      "rabbit",
      "horse",
      "blood",
      "scaleless_fish",
      "crustacean",
      "mollusc",
      "carmine",
    ],
    verify: ["gelatin"],
    maybe: ["pork", "meat", "crustacean"],
  },
  gluten_free: { conflict: ["gluten"], maybe: ["gluten"] },
  lactose_free: { conflict: ["dairy"], maybe: ["dairy"] },
};

export type RecipeContext = {
  /** The recipe contains meat or poultry (kosher: no dairy with it). */
  hasMeat: boolean;
};

function wordIn(text: string, word: string): boolean {
  if (!word) return false;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9])${escaped}s?(?![a-z0-9])`).test(text);
}

/** Every reason this ingredient does not suit the rules (empty = fine). */
export function causesFor(
  analysis: IngredientAnalysis,
  text: string,
  rules: FoodRules,
  context: RecipeContext,
): Cause[] {
  const causes: Cause[] = [];
  const { attributes: attrs, maybe } = analysis;

  for (const diet of rules.diets) {
    const rule = DIET_RULES[diet];
    const labelled =
      (diet === "halal" && attrs.has("halal_label")) ||
      (diet === "kosher" && attrs.has("kosher_label"));
    let found = false;
    for (const code of rule.conflict) {
      if (!attrs.has(code)) continue;
      if (
        diet === "lactose_free" &&
        (attrs.has("lactose_free") || attrs.has("low_lactose"))
      ) {
        continue;
      }
      causes.push({ kind: "diet", diet, code, level: "conflict" });
      found = true;
    }
    if (found) continue;
    if (
      diet === "kosher" &&
      context.hasMeat &&
      attrs.has("dairy") &&
      !attrs.has("meat")
    ) {
      causes.push({
        kind: "diet",
        diet,
        code: "meat_with_dairy",
        level: "conflict",
      });
      continue;
    }
    if (labelled) continue;
    const verify =
      rule.verify?.find((code) => attrs.has(code)) ??
      rule.maybe?.find(
        (code) =>
          maybe.has(code) &&
          !(diet === "lactose_free" && attrs.has("lactose_free")),
      );
    if (verify) {
      causes.push({ kind: "diet", diet, code: verify, level: "verify" });
    }
  }

  for (const allergen of rules.allergens) {
    if (analysis.allergens.has(allergen)) {
      causes.push({ kind: "allergen", allergen, level: "conflict" });
    } else if (analysis.maybeAllergens.has(allergen)) {
      causes.push({ kind: "allergen", allergen, level: "verify" });
    }
  }

  for (const raw of rules.dislikes) {
    const word = normalize(raw);
    if (wordIn(text, word)) {
      causes.push({ kind: "dislike", word: raw, level: "conflict" });
    }
  }

  return causes;
}

/** Recipe-level caveats: certification, rennet, labels. Never a verdict. */
export type Note =
  | "meat_certified_halal"
  | "meat_certified_kosher"
  | "cheese_certified_kosher"
  | "grape_certified_kosher"
  | "seafood_practices"
  | "rennet"
  | "low_lactose"
  | "gluten_labels"
  | "allergy_labels";

export function notesFor(
  analyses: IngredientAnalysis[],
  rules: FoodRules,
): Note[] {
  const has = (a: Attribute) => analyses.some((x) => x.attributes.has(a));
  const notes: Note[] = [];
  const diets = new Set(rules.diets);
  const meat = analyses.some(
    (x) => x.attributes.has("meat") && !x.attributes.has("halal_label"),
  );
  if (diets.has("halal") && meat) notes.push("meat_certified_halal");
  if (diets.has("halal") && (has("crustacean") || has("mollusc"))) {
    notes.push("seafood_practices");
  }
  if (diets.has("kosher")) {
    if (has("meat")) notes.push("meat_certified_kosher");
    if (has("cheese")) notes.push("cheese_certified_kosher");
    if (has("grape")) notes.push("grape_certified_kosher");
  }
  if (diets.has("vegetarian") && has("animal_rennet")) notes.push("rennet");
  if (diets.has("lactose_free") && has("low_lactose")) {
    notes.push("low_lactose");
  }
  if (diets.has("gluten_free")) notes.push("gluten_labels");
  if (rules.allergens.length > 0) notes.push("allergy_labels");
  return notes;
}
