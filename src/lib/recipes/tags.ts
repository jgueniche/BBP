import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";
import { moderateText } from "@/lib/moderation/filter";
import {
  canonicalSlugs,
  normalizeTag,
  MAX_TAGS_PER_RECIPE,
  type TagNode,
} from "@/lib/social/tags";

type Supabase = SupabaseClient<Database>;

export async function loadTagRegistry(supabase: Supabase): Promise<TagNode[]> {
  const { data } = await supabase
    .from("tags")
    .select("id, slug, canonical_id, parent_id")
    .limit(5000);
  return (data ?? []).map((t) => ({
    id: t.id,
    slug: t.slug,
    canonicalId: t.canonical_id,
    parentId: t.parent_id,
  }));
}

/**
 * Normalise what the person typed, map synonyms to their reference tag and
 * register new tags for moderation review. Tags the filter blocks are dropped.
 */
export async function resolveRecipeTags(
  supabase: Supabase,
  userId: string,
  raw: readonly string[],
): Promise<string[]> {
  const typed = raw
    .map(normalizeTag)
    .filter((t): t is NonNullable<typeof t> => t !== null)
    .filter((t) => moderateText(t.label).allow)
    .slice(0, MAX_TAGS_PER_RECIPE);
  if (typed.length === 0) return [];

  const registry = await loadTagRegistry(supabase);
  const known = new Set(registry.map((t) => t.slug));
  const fresh = typed.filter((t) => !known.has(t.slug));
  if (fresh.length > 0) {
    await supabase.from("tags").upsert(
      fresh.map((t) => ({ slug: t.slug, label: t.label, created_by: userId })),
      { onConflict: "slug", ignoreDuplicates: true },
    );
  }
  return canonicalSlugs(
    typed.map((t) => t.slug),
    registry,
  );
}
