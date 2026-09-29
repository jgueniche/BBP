import { analyzeIngredient, normalize } from "./ingredients";
import { causesFor, notesFor, type Cause, type Note } from "./rules";
import { swapCandidates } from "./substitutions";
import {
  DIETS,
  hasRules,
  type Diet,
  type EngineIngredient,
  type FoodRules,
  type IngredientAnalysis,
} from "./types";

/**
 * Four states from the Claude Design charter (ADR-030/032): compatible,
 * adaptable (with checked swaps), incompatible (neutral grey, never red) and
 * « à vérifier » when something cannot be known from the ingredients.
 */
export type VerdictStatus =
  "compatible" | "adaptable" | "incompatible" | "verify";

export type Substitution = { kind: "swap"; label: string } | { kind: "omit" };

export type Finding = {
  label: string;
  level: "conflict" | "verify";
  causes: Cause[];
  substitution: Substitution | null;
};

export type RecipeVerdict = {
  status: VerdictStatus;
  findings: Finding[];
  notes: Note[];
};

const OPTIONAL =
  /(?<![a-z])(facultatif|facultative|optionnel|optionnelle|pour (decorer|la deco|servir)|deco)(?![a-z])/;
const SHELLFISH = new Set(["crustacean", "mollusc"]);
/** Nothing replaces these: the dish is made of them. */
const NO_SWAP = new Set(["blood"]);

function levelOf(causes: Cause[]): "conflict" | "verify" {
  return causes.some((c) => c.level === "conflict") ? "conflict" : "verify";
}

type Prepared = {
  ingredient: EngineIngredient;
  text: string;
  analysis: IngredientAnalysis;
};

function prepare(ingredients: readonly EngineIngredient[]): Prepared[] {
  return ingredients.map((ingredient) => ({
    ingredient,
    text: normalize(`${ingredient.label} ${ingredient.foodName ?? ""}`),
    analysis: analyzeIngredient(ingredient.label, ingredient.foodName),
  }));
}

function evaluatePrepared(
  prepared: Prepared[],
  rules: FoodRules,
): RecipeVerdict {
  const context = {
    hasMeat: prepared.some((p) => p.analysis.attributes.has("meat")),
  };
  const totalGrams = prepared.reduce(
    (sum, p) => sum + (p.ingredient.grams ?? 0),
    0,
  );

  const findings: Finding[] = [];
  for (const p of prepared) {
    const causes = causesFor(p.analysis, p.text, rules, context);
    if (causes.length === 0) continue;

    const grams = p.ingredient.grams ?? null;
    const share = grams !== null && totalGrams > 0 ? grams / totalGrams : null;
    const isMain = share !== null && share >= 0.35;
    const isMinor =
      OPTIONAL.test(p.text) ||
      (grams !== null && (grams <= 15 || (share !== null && share <= 0.03)));
    const shellfishMain =
      isMain && causes.some((c) => c.kind === "diet" && SHELLFISH.has(c.code));

    const noSwap = causes.some((c) => c.kind === "diet" && NO_SWAP.has(c.code));
    let substitution: Substitution | null = null;
    if (!shellfishMain && !noSwap) {
      for (const candidate of swapCandidates(
        normalize(p.ingredient.label),
        p.ingredient.label,
        causes,
      )) {
        const analysis = analyzeIngredient(candidate);
        const left = causesFor(analysis, normalize(candidate), rules, context);
        if (left.length === 0) {
          substitution = { kind: "swap", label: candidate };
          break;
        }
      }
    }
    const onlyDislikes = causes.every((c) => c.kind === "dislike");
    if (!substitution && (isMinor || onlyDislikes)) {
      substitution = { kind: "omit" };
    }

    findings.push({
      label: p.ingredient.label,
      level: levelOf(causes),
      causes,
      substitution,
    });
  }

  let status: VerdictStatus = "compatible";
  if (findings.some((f) => f.level === "conflict" && !f.substitution)) {
    status = "incompatible";
  } else if (findings.some((f) => !f.substitution)) {
    status = "verify";
  } else if (findings.length > 0) {
    status = "adaptable";
  }

  return {
    status,
    findings,
    notes: notesFor(
      prepared.map((p) => p.analysis),
      rules,
    ),
  };
}

/** Verdict of one recipe for a set of rules; null when no rule is set. */
export function evaluateRecipe(
  ingredients: readonly EngineIngredient[],
  rules: FoodRules | null,
): RecipeVerdict | null {
  if (!rules || !hasRules(rules)) return null;
  return evaluatePrepared(prepare(ingredients), rules);
}

/** Diets implied by a more specific compatible one (shown once). */
const IMPLIED_BY: Partial<Record<Diet, Diet[]>> = {
  vegan: ["vegetarian", "pescatarian", "no_pork"],
  vegetarian: ["pescatarian", "no_pork"],
  pescatarian: ["no_pork"],
  halal: ["no_pork", "no_alcohol"],
  kosher: ["no_pork"],
};

export type DietFacts = {
  /** Diets the ingredients suit as they are, most specific first. */
  diets: Diet[];
  /** Meat to choose certified (halal or kosher compatible with meat). */
  certifiedMeat: boolean;
};

/**
 * Recipe facts for every table (« toutes les tables »): which simple diets
 * the ingredients suit without any change. Public, never personal.
 */
export function recipeDietFacts(
  ingredients: readonly EngineIngredient[],
): DietFacts {
  if (ingredients.length === 0) return { diets: [], certifiedMeat: false };
  const prepared = prepare(ingredients);
  const compatible = DIETS.filter(
    (diet) =>
      evaluatePrepared(prepared, { diets: [diet], allergens: [], dislikes: [] })
        .status === "compatible",
  );
  const hidden = new Set(compatible.flatMap((d) => IMPLIED_BY[d] ?? []));
  const diets = compatible.filter((d) => !hidden.has(d));
  const hasMeat = prepared.some((p) => p.analysis.attributes.has("meat"));
  const certifiedMeat =
    hasMeat && (compatible.includes("halal") || compatible.includes("kosher"));
  return { diets, certifiedMeat };
}

/** Plannable = compatible as is (the planner never applies swaps). */
export function isPlannable(verdict: RecipeVerdict | null): boolean {
  return verdict === null || verdict.status === "compatible";
}
