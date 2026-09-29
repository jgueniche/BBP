import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";
import { todayIn } from "@/lib/utils/local-date";

type Supabase = SupabaseClient<Database>;

export type RecordCookResult =
  | { ok: true; id: string; recipeSlug: string; authorId: string | null }
  | { ok: false };

/**
 * Writes a journal entry for a visible recipe (its title is kept in case the
 * recipe goes away). authorId is the recipe's author when it is someone else.
 */
export async function recordCook(
  supabase: Supabase,
  userId: string,
  entry: {
    recipeId: string;
    cookedOn?: string;
    note: string | null;
    postId: string | null;
  },
): Promise<RecordCookResult> {
  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, slug, title, author_id")
    .eq("id", entry.recipeId)
    .maybeSingle();
  if (!recipe) return { ok: false };
  const { data, error } = await supabase
    .from("cook_logs")
    .insert({
      user_id: userId,
      recipe_id: recipe.id,
      recipe_title: recipe.title.slice(0, 200),
      cooked_on: entry.cookedOn ?? todayIn(),
      note: entry.note,
      post_id: entry.postId,
    })
    .select("id")
    .single();
  if (error) return { ok: false };
  return {
    ok: true,
    id: data.id,
    recipeSlug: recipe.slug,
    authorId:
      recipe.author_id && recipe.author_id !== userId ? recipe.author_id : null,
  };
}

/** « Cuisinée N fois »: every journal entry, anonymously. */
export async function loadCookCounts(
  supabase: Supabase,
  recipeIds: string[],
): Promise<Map<string, number>> {
  const ids = [...new Set(recipeIds)].slice(0, 500);
  if (ids.length === 0) return new Map();
  const { data } = await supabase.rpc("recipe_cook_counts", {
    recipe_ids: ids,
  });
  return new Map(
    (data ?? []).map((row) => [row.recipe_id, Number(row.cooked)]),
  );
}

/** The recipes waiting in my « À cuisiner » list. */
export async function loadToCookIds(
  supabase: Supabase,
  userId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("to_cook")
    .select("recipe_id")
    .eq("user_id", userId)
    .limit(500);
  return new Set((data ?? []).map((row) => row.recipe_id));
}
