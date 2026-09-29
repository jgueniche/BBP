/**
 * « Ma version » credit chain: each version credits the recipe it comes from,
 * up to the original author or creator (« d'après … »).
 */
export type VersionLink = {
  title: string;
  slug: string;
  /** Member name when the profile is public, else null. */
  authorName: string | null;
  /** Creator credited at import (« @nour.en.cuisine »), when any. */
  sourceAuthor: string | null;
};

export const MAX_CHAIN = 5;

/** « d'après « Tarte » de Léa, d'après @maya.cuisine » (nearest first). */
export function creditLine(chain: readonly VersionLink[]): string | null {
  if (chain.length === 0) return null;
  const parts = chain.map((link) =>
    link.authorName
      ? `« ${link.title} » de ${link.authorName}`
      : `« ${link.title} »`,
  );
  const origin = chain.at(-1)?.sourceAuthor;
  if (origin) parts.push(origin);
  return `d'après ${parts.join(", d'après ")}`;
}
