/**
 * Free tags (session 20, AO3 model): members type anything, it is stored as a
 * normalised slug; moderators attach synonyms to a reference tag and group
 * tags under categories. Pure helpers, shared by the editor and the actions.
 */
export type NormalisedTag = { slug: string; label: string };

export const MAX_TAGS_PER_RECIPE = 10;

export function normalizeTag(raw: string): NormalisedTag | null {
  const label = raw.replace(/^#+/, "").replace(/\s+/g, " ").trim();
  const slug = label
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length < 2 || slug.length > 40 || label.length > 40) return null;
  return { slug, label };
}

/** « batch cooking, #Sans four ,  » → unique normalised tags, in order. */
export function parseTagInput(input: string): NormalisedTag[] {
  const seen = new Set<string>();
  const tags: NormalisedTag[] = [];
  for (const part of input.split(/[,;\n]/)) {
    const tag = normalizeTag(part);
    if (!tag || seen.has(tag.slug)) continue;
    seen.add(tag.slug);
    tags.push(tag);
    if (tags.length === MAX_TAGS_PER_RECIPE) break;
  }
  return tags;
}

export type TagNode = {
  id: string;
  slug: string;
  canonicalId: string | null;
  parentId: string | null;
};

/** Replace synonyms by their reference tag, keeping order and uniqueness. */
export function canonicalSlugs(
  slugs: readonly string[],
  registry: readonly TagNode[],
): string[] {
  const bySlug = new Map(registry.map((t) => [t.slug, t]));
  const byId = new Map(registry.map((t) => [t.id, t]));
  const out: string[] = [];
  for (const slug of slugs) {
    const tag = bySlug.get(slug);
    const canonical = tag?.canonicalId ? byId.get(tag.canonicalId) : undefined;
    const resolved = canonical?.slug ?? slug;
    if (!out.includes(resolved)) out.push(resolved);
  }
  return out;
}

/**
 * Every slug a tag page covers: the reference tag, its synonyms, and for a
 * category, its child tags and their synonyms (two levels at most).
 */
export function slugsCoveredBy(
  tagId: string,
  registry: readonly TagNode[],
): string[] {
  const ids = new Set<string>([tagId]);
  for (let depth = 0; depth < 2; depth += 1) {
    for (const tag of registry) {
      if (tag.parentId && ids.has(tag.parentId)) ids.add(tag.id);
    }
  }
  for (const tag of registry) {
    if (tag.canonicalId && ids.has(tag.canonicalId)) ids.add(tag.id);
  }
  return registry.filter((t) => ids.has(t.id)).map((t) => t.slug);
}
