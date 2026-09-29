import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";
import { cookSummary } from "@/lib/journal/journal";
import { loadCookCounts } from "@/lib/journal/server";
import {
  anonymousMember,
  loadMembers,
  type MemberSummary,
} from "@/lib/social/members";
import { publicPhotoUrl } from "@/lib/social/photos";

import { MAX_CHAIN, type VersionLink } from "./versions";

type Supabase = SupabaseClient<Database>;

async function names(
  supabase: Supabase,
  ids: string[],
): Promise<Map<string, string | null>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", [...new Set(ids)]);
  return new Map(
    (data ?? []).map((p) => [p.id, p.display_name ?? p.username ?? null]),
  );
}

export type CookedEntry = {
  id: string;
  text: string | null;
  photo: string | null;
  authorName: string | null;
  createdAt: string;
};

export type CookedSummary = {
  /** Every journal entry, anonymously (« Cuisinée N fois »). */
  count: number;
  /** Latest shared versions, photos first. */
  entries: CookedEntry[];
  /** People I follow who shared a « j'ai cuisiné » of it (never the journal). */
  friends: MemberSummary[];
  /** My own journal: how many times, and when last. */
  mine: { times: number; last: string | null };
};

export async function loadCooked(
  supabase: Supabase,
  recipeId: string,
  viewerId: string | null,
): Promise<CookedSummary> {
  const [counts, { data: posts }, { data: follows }, { data: myCooks }] =
    await Promise.all([
      loadCookCounts(supabase, [recipeId]),
      supabase
        .from("posts")
        .select("id, text, photo_paths, author_id, created_at")
        .eq("kind", "cooked")
        .eq("recipe_id", recipeId)
        .neq("moderation", "blocked")
        .order("created_at", { ascending: false })
        .limit(12),
      viewerId
        ? supabase
            .from("follows")
            .select("followed_id")
            .eq("follower_id", viewerId)
            .limit(1000)
        : Promise.resolve({ data: [] }),
      viewerId
        ? supabase
            .from("cook_logs")
            .select("cooked_on")
            .eq("user_id", viewerId)
            .eq("recipe_id", recipeId)
        : Promise.resolve({ data: [] }),
    ]);
  const followed = (follows ?? []).map((f) => f.followed_id);
  const { data: friendPosts } =
    followed.length > 0
      ? await supabase
          .from("posts")
          .select("author_id")
          .eq("kind", "cooked")
          .eq("recipe_id", recipeId)
          .eq("visibility", "community")
          .neq("moderation", "blocked")
          .in("author_id", followed)
          .order("created_at", { ascending: false })
          .limit(30)
      : { data: [] };
  const friendIds = [
    ...new Set((friendPosts ?? []).map((p) => p.author_id)),
  ].slice(0, 6);
  const members = await loadMembers(supabase, [
    ...(posts ?? []).map((p) => p.author_id),
    ...friendIds,
  ]);
  return {
    count: counts.get(recipeId) ?? 0,
    entries: (posts ?? []).map((post) => ({
      id: post.id,
      text: post.text,
      photo: post.photo_paths[0] ? publicPhotoUrl(post.photo_paths[0]) : null,
      authorName: members.get(post.author_id)?.name ?? null,
      createdAt: post.created_at,
    })),
    friends: friendIds.map((id) => members.get(id) ?? anonymousMember(id)),
    mine: cookSummary((myCooks ?? []).map((c) => c.cooked_on)),
  };
}

export type TipRow = {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  authorName: string | null;
  helpful: number;
  votedByMe: boolean;
};

export async function loadTips(
  supabase: Supabase,
  recipeId: string,
  userId: string,
): Promise<TipRow[]> {
  const { data: comments } = await supabase
    .from("recipe_comments")
    .select("id, text, created_at, user_id, moderation")
    .eq("recipe_id", recipeId)
    .order("created_at")
    .limit(100);
  const visible = (comments ?? []).filter(
    (c) => c.moderation !== "blocked" || c.user_id === userId,
  );
  const ids = visible.map((c) => c.id);
  const [{ data: stats }, { data: mine }, byId] = await Promise.all([
    ids.length > 0
      ? supabase
          .from("recipe_comment_stats")
          .select("comment_id, helpful")
          .in("comment_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length > 0
      ? supabase
          .from("recipe_comment_votes")
          .select("comment_id")
          .eq("user_id", userId)
          .in("comment_id", ids)
      : Promise.resolve({ data: [] }),
    names(
      supabase,
      visible.map((c) => c.user_id),
    ),
  ]);
  const helpful = new Map((stats ?? []).map((s) => [s.comment_id, s.helpful]));
  const voted = new Set((mine ?? []).map((v) => v.comment_id));
  return visible.map((c) => ({
    id: c.id,
    text: c.text,
    created_at: c.created_at,
    user_id: c.user_id,
    authorName: byId.get(c.user_id) ?? null,
    helpful: helpful.get(c.id) ?? 0,
    votedByMe: voted.has(c.id),
  }));
}

/** The recipes this one comes from, nearest first (visible ones only). */
export async function loadCreditChain(
  supabase: Supabase,
  parentId: string | null,
): Promise<VersionLink[]> {
  const chain: Array<VersionLink & { authorId: string | null }> = [];
  let next = parentId;
  const seen = new Set<string>();
  while (next && chain.length < MAX_CHAIN && !seen.has(next)) {
    seen.add(next);
    const { data } = await supabase
      .from("recipes")
      .select("id, title, slug, author_id, source_author, parent_recipe_id")
      .eq("id", next)
      .maybeSingle();
    if (!data) break;
    chain.push({
      title: data.title,
      slug: data.slug,
      authorName: null,
      sourceAuthor: data.source_author,
      authorId: data.author_id,
    });
    next = data.parent_recipe_id;
  }
  const byId = await names(
    supabase,
    chain.map((c) => c.authorId).filter((id): id is string => id !== null),
  );
  return chain.map(({ authorId, ...link }) => ({
    ...link,
    authorName: authorId ? (byId.get(authorId) ?? null) : null,
  }));
}

export type CommunityVersion = {
  slug: string;
  title: string;
  authorName: string | null;
};

/** Versions other members shared publicly (« onglet Versions »). */
export async function loadCommunityVersions(
  supabase: Supabase,
  recipeId: string,
): Promise<CommunityVersion[]> {
  const { data } = await supabase
    .from("recipes")
    .select("slug, title, author_id")
    .eq("parent_recipe_id", recipeId)
    .eq("visibility", "community")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(20);
  const byId = await names(
    supabase,
    (data ?? [])
      .map((r) => r.author_id)
      .filter((id): id is string => id !== null),
  );
  return (data ?? []).map((r) => ({
    slug: r.slug,
    title: r.title,
    authorName: r.author_id ? (byId.get(r.author_id) ?? null) : null,
  }));
}
