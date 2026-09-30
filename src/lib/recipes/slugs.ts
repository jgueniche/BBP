/**
 * Static pages under /recettes win over /recettes/[slug]: a recipe must never
 * take one of these slugs or its page would be unreachable.
 */
const RESERVED_RECIPE_SLUGS = new Set([
  "carnets",
  "etiquette",
  "importer",
  "journal",
  "nouvelle",
]);

export function isReservedRecipeSlug(slug: string): boolean {
  return RESERVED_RECIPE_SLUGS.has(slug);
}
