import type { KashrutClass } from "@/lib/kashrut/meal";

/** Ciqual food group → supermarket aisle (French labels shown in the list). */
const AISLE_BY_CATEGORY: Array<[RegExp, string]> = [
  [/fruits, légumes/i, "Fruits & légumes"],
  [/viandes, œufs, poissons/i, "Boucherie & poissonnerie"],
  [/produits laitiers/i, "Crèmerie"],
  [/produits céréaliers/i, "Épicerie"],
  [/aides culinaires/i, "Épicerie"],
  [/matières grasses/i, "Huiles & condiments"],
  [/produits sucrés/i, "Épicerie sucrée"],
  [/eaux et autres boissons/i, "Boissons"],
  [/glaces et sorbets/i, "Surgelés"],
  [/entrées et plats composés/i, "Traiteur"],
];

export const DEFAULT_AISLE = "Autres";

export function aisleForCategory(category: string | null): string {
  if (!category) return DEFAULT_AISLE;
  for (const [pattern, aisle] of AISLE_BY_CATEGORY) {
    if (pattern.test(category)) return aisle;
  }
  return DEFAULT_AISLE;
}

/**
 * Products that call for a kosher grocery / hekhsher check: meat, cheese,
 * wine and grape juice (brief §4.7 — indication, never a certification).
 */
export function needsKosherNote(params: {
  kashrutClass: KashrutClass | null;
  label: string;
}): boolean {
  if (params.kashrutClass === "bassari") return true;
  return /\b(fromage|vin|jus de raisin)\b/i.test(params.label);
}
