/** Tips under a recipe: most voted « utile » first, then oldest first. */
export type TipLike = { id: string; created_at: string; helpful: number };

export function sortTips<T extends TipLike>(tips: readonly T[]): T[] {
  return [...tips].sort(
    (a, b) => b.helpful - a.helpful || a.created_at.localeCompare(b.created_at),
  );
}
