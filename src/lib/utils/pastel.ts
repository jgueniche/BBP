// Pastel panel fills from the Copine en cuisine palette (globals.css).
// Class names are spelled out so Tailwind picks them up at build time.

export const PASTELS = [
  "rose",
  "lilas",
  "menthe",
  "beurre",
  "peche",
  "ciel",
] as const;

export type Pastel = (typeof PASTELS)[number];

export const PASTEL_BG: Record<Pastel, string> = {
  rose: "bg-rose",
  lilas: "bg-lilas",
  menthe: "bg-menthe",
  beurre: "bg-beurre",
  peche: "bg-peche",
  ciel: "bg-ciel",
};

/** Pastel for the n-th item of a list: neighbours never share a tint. */
export function pastelAt(index: number): Pastel {
  const i =
    ((Math.trunc(index) % PASTELS.length) + PASTELS.length) % PASTELS.length;
  return PASTELS[i];
}

/** Stable pastel for an id or slug, so an item keeps its tint across pages. */
export function pastelFor(key: string): Pastel {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return pastelAt(Math.abs(hash));
}
