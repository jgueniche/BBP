import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";
import { checkImport } from "@/lib/creators/server";

import { fetchPage, resolveRedirects } from "./fetch";
import type {
  ExtractInput,
  ImportDraft,
  MyCopy,
  PipelineDeps,
} from "./pipeline";
import { pinterestOrigin, tiktokPost, youtubeVideo } from "./remote";

type Supabase = SupabaseClient<Database>;

/**
 * My copy of an original post: one I imported (my own version first), else
 * one I saved (a friend's copy, the official version).
 */
export async function findMyCopy(
  supabase: Supabase,
  userId: string,
  sourceKey: string,
): Promise<MyCopy | null> {
  const { data: own } = await supabase
    .from("recipes")
    .select("slug, title, parent_recipe_id, created_at")
    .eq("author_id", userId)
    .eq("source_key", sourceKey)
    .order("parent_recipe_id", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (own) return { slug: own.slug, title: own.title, saved: false };
  const { data: copies } = await supabase
    .from("recipes")
    .select("id, slug, title")
    .eq("source_key", sourceKey)
    .limit(50);
  if (!copies || copies.length === 0) return null;
  const { data: saves } = await supabase
    .from("recipe_saves")
    .select("recipe_id")
    .eq("user_id", userId)
    .in(
      "recipe_id",
      copies.map((copy) => copy.id),
    )
    .limit(1);
  const saved = copies.find((copy) => copy.id === saves?.[0]?.recipe_id);
  return saved ? { slug: saved.slug, title: saved.title, saved: true } : null;
}

/** The real network, AI and database behind an import, as the member. */
export function pipelineDeps(
  supabase: Supabase,
  userId: string,
  extract: ((input: ExtractInput) => Promise<ImportDraft | null>) | null,
): PipelineDeps {
  return {
    fetchPage: (url, options) => fetchPage(url, options),
    resolveShortLink: (url, options) => resolveRedirects(url, options),
    tiktokPost,
    youtubeVideo,
    pinterestOrigin,
    extract,
    checkCreator: (url, identity) => checkImport(supabase, url, identity),
    findMyCopy: (key) => findMyCopy(supabase, userId, key),
  };
}
