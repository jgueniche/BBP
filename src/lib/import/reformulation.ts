// The recipe card is written in our own words, never the original caption
// or page word for word (brief §7). The AI is asked to reformulate; this
// check proves it did: any run of 8 words found in the source counts as a
// copied passage.

export const COPIED_RUN = 8;

function words(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);
}

function runs(list: string[], size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + size <= list.length; i += 1) {
    out.push(list.slice(i, i + size).join(" "));
  }
  return out;
}

/**
 * The texts (steps, description) that repeat at least `size` consecutive
 * words of the source. Ingredient lists are facts and are not checked.
 */
export function copiedPassages(
  source: string,
  texts: string[],
  size: number = COPIED_RUN,
): string[] {
  const known = new Set(runs(words(source), size));
  if (known.size === 0) return [];
  return texts.filter((text) =>
    runs(words(text), size).some((run) => known.has(run)),
  );
}
