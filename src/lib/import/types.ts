import type { Category, Cuisine } from "@/lib/recipes/cuisines";

export type ImportedIngredient = {
  label: string;
  grams: number | null;
  section: string | null;
};

export type ImportedStep = {
  text: string;
  durationMin: number | null;
  section: string | null;
};

/** Normalized recipe draft produced by any import path, consumed by the editor. */
export type RecipeDraft = {
  title: string;
  description: string | null;
  servings: number | null;
  prepMin: number | null;
  cookMin: number | null;
  tags: string[];
  category: Category | null;
  cuisine: Cuisine | null;
  ingredients: ImportedIngredient[];
  steps: ImportedStep[];
  sourceUrl: string | null;
  sourceAuthor: string | null;
  /** How the draft was produced — the UI adapts its "check everything" hint. */
  method: "ai" | "structured" | "heuristic";
  /**
   * The steps and description are our own words (never the original text
   * word for word). False without AI: the member reformulates before sharing.
   */
  reformulated: boolean;
};
