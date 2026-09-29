export const COLLECTION_COLORS = [
  "boutargue",
  "halavi",
  "bassari",
  "ok",
  "warn",
  "parve",
  "ink",
] as const;

export type CollectionColor = (typeof COLLECTION_COLORS)[number];

/** Cover tint per stored color key (legacy BBP keys, kept to avoid a data
 *  migration) — pastel panels from the Copine palette, ink text stays readable. */
export const COLLECTION_COLOR_CLASSES: Record<CollectionColor, string> = {
  boutargue: "bg-rose",
  halavi: "bg-ciel",
  bassari: "bg-peche",
  ok: "bg-menthe",
  warn: "bg-beurre",
  parve: "bg-lilas",
  ink: "bg-nacre",
};
