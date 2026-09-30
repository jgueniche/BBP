export type SuggestionCandidate = {
  id: string;
  /** Recipes this member shared a « j'ai cuisiné » for, recently. */
  recipeIds: string[];
  lastAt: string;
};

export type RankedSuggestion<T extends SuggestionCandidate> = T & {
  /** Recipes in common with my journal, my list and my book. */
  shared: number;
};

/**
 * Members to follow when the friends' feed is empty: first those who cook
 * what I cook, then those who shared recently. Never a public ranking: the
 * order is only shown to me, and nobody is listed by volume.
 */
export function rankSuggestions<T extends SuggestionCandidate>(
  candidates: T[],
  options: {
    myRecipeIds: ReadonlySet<string>;
    exclude: ReadonlySet<string>;
    limit?: number;
  },
): RankedSuggestion<T>[] {
  const limit = options.limit ?? 6;
  return candidates
    .filter((candidate) => !options.exclude.has(candidate.id))
    .map((candidate) => ({
      ...candidate,
      shared: new Set(
        candidate.recipeIds.filter((id) => options.myRecipeIds.has(id)),
      ).size,
    }))
    .sort(
      (a, b) =>
        b.shared - a.shared ||
        Date.parse(b.lastAt) - Date.parse(a.lastAt) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, limit);
}
