export const COLLECTION_COLORS = [
  "rose",
  "ciel",
  "peche",
  "menthe",
  "beurre",
  "lilas",
  "nacre",
] as const;

export type CollectionColor = (typeof COLLECTION_COLORS)[number];

/** Cover tint per stored color key: pastel panels, ink text stays readable. */
export const COLLECTION_COLOR_CLASSES: Record<CollectionColor, string> = {
  rose: "bg-rose",
  ciel: "bg-ciel",
  peche: "bg-peche",
  menthe: "bg-menthe",
  beurre: "bg-beurre",
  lilas: "bg-lilas",
  nacre: "bg-nacre",
};
