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

/** Cover tint per color token — soft backgrounds, ink text stays readable. */
export const COLLECTION_COLOR_CLASSES: Record<CollectionColor, string> = {
  boutargue: "bg-boutargue-soft",
  halavi: "bg-halavi/15",
  bassari: "bg-bassari/15",
  ok: "bg-ok/15",
  warn: "bg-warn/15",
  parve: "bg-parve/15",
  ink: "bg-ink-10",
};
