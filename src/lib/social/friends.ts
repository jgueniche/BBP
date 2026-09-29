import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";

import { loadMembers, type MemberSummary } from "./members";
import { rankSuggestions, type SuggestionCandidate } from "./suggestions";

type Supabase = SupabaseClient<Database>;

export type Suggestion = MemberSummary & { shared: number };

/**
 * Public profiles that shared a « j'ai cuisiné » lately, those who cook the
 * recipes of my journal, list and book first. Only my own data is read to
 * rank them; nothing about me is shown to them.
 */
export async function loadSuggestions(
  supabase: Supabase,
  userId: string,
  followedIds: string[],
): Promise<Suggestion[]> {
  const [
    { data: posts },
    { data: blocks },
    { data: cooks },
    { data: queue },
    { data: saves },
  ] = await Promise.all([
    supabase
      .from("posts")
      .select("author_id, recipe_id, created_at")
      .eq("kind", "cooked")
      .eq("visibility", "community")
      .eq("moderation", "ok")
      .is("group_id", null)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", userId),
    supabase
      .from("cook_logs")
      .select("recipe_id")
      .eq("user_id", userId)
      .limit(500),
    supabase
      .from("to_cook")
      .select("recipe_id")
      .eq("user_id", userId)
      .limit(500),
    supabase
      .from("recipe_saves")
      .select("recipe_id")
      .eq("user_id", userId)
      .limit(500),
  ]);

  const exclude = new Set([
    userId,
    ...followedIds,
    ...(blocks ?? []).map((b) => b.blocked_id),
  ]);
  const byAuthor = new Map<string, SuggestionCandidate>();
  for (const post of posts ?? []) {
    if (exclude.has(post.author_id)) continue;
    const candidate = byAuthor.get(post.author_id) ?? {
      id: post.author_id,
      recipeIds: [],
      lastAt: post.created_at,
    };
    if (post.recipe_id) candidate.recipeIds.push(post.recipe_id);
    byAuthor.set(post.author_id, candidate);
  }
  // Only public profiles can be suggested (RLS returns nothing else).
  const members = await loadMembers(supabase, [...byAuthor.keys()]);
  const candidates = [...byAuthor.values()].filter(
    (candidate) => members.get(candidate.id)?.name,
  );
  const mine = new Set(
    [...(cooks ?? []), ...(queue ?? []), ...(saves ?? [])]
      .map((row) => row.recipe_id)
      .filter((id): id is string => id !== null),
  );
  return rankSuggestions(candidates, { myRecipeIds: mine, exclude }).map(
    (candidate) => ({
      ...members.get(candidate.id)!,
      shared: candidate.shared,
    }),
  );
}
