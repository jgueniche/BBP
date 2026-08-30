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
  ingredients: ImportedIngredient[];
  steps: ImportedStep[];
  sourceUrl: string | null;
  sourceAuthor: string | null;
  /** How the draft was produced — the UI adapts its "check everything" hint. */
  method: "ai" | "structured" | "heuristic";
};
