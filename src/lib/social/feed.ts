import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { FeedPost, ReactionKind } from "@/components/social/post-card";
import type { Database } from "@/db/types";

type Supabase = SupabaseClient<Database>;

/** Assemble RLS-visible posts with stats, names and my reactions/follows. */
export async function loadFeedPosts(
  supabase: Supabase,
  currentUserId: string,
  opts: {
    groupId?: string;
    authorId?: string;
    onlyFollowed?: boolean;
    limit?: number;
  } = {},
): Promise<FeedPost[]> {
  const limit = opts.limit ?? 30;

  let followedIds: string[] | null = null;
  if (opts.onlyFollowed) {
    const { data: follows } = await supabase
      .from("follows")
      .select("followed_id")
      .eq("follower_id", currentUserId);
    followedIds = (follows ?? []).map((f) => f.followed_id);
    if (followedIds.length === 0) return [];
  }

  const { data: blocks } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", currentUserId);
  const blocked = new Set((blocks ?? []).map((b) => b.blocked_id));

  let query = supabase
    .from("posts")
    .select(
      "id, author_id, kind, text, recipe_id, group_id, visibility, moderation, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (opts.groupId) query = query.eq("group_id", opts.groupId);
  else if (!opts.authorId) query = query.is("group_id", null);
  if (opts.authorId) query = query.eq("author_id", opts.authorId);
  if (followedIds) query = query.in("author_id", followedIds);

  const { data: rows } = await query;
  const posts = (rows ?? []).filter((post) => !blocked.has(post.author_id));
  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const recipeIds = [
    ...new Set(
      posts.map((p) => p.recipe_id).filter((id): id is string => id !== null),
    ),
  ];
  const groupIds = [
    ...new Set(
      posts.map((p) => p.group_id).filter((id): id is string => id !== null),
    ),
  ];

  const [
    { data: stats },
    { data: reactions },
    { data: profiles },
    { data: follows },
    { data: recipes },
    { data: groups },
  ] = await Promise.all([
    supabase
      .from("post_stats")
      .select("post_id, bsahtek, mabrouk, yaouili, comments")
      .in("post_id", postIds),
    supabase
      .from("post_reactions")
      .select("post_id, kind")
      .in("post_id", postIds)
      .eq("user_id", currentUserId),
    supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", authorIds),
    supabase
      .from("follows")
      .select("followed_id")
      .eq("follower_id", currentUserId),
    recipeIds.length > 0
      ? supabase
          .from("recipes")
          .select("id, slug, title, icon")
          .in("id", recipeIds)
      : Promise.resolve({ data: [] }),
    groupIds.length > 0
      ? supabase.from("groups").select("id, slug, name").in("id", groupIds)
      : Promise.resolve({ data: [] }),
  ]);

  const statsById = new Map((stats ?? []).map((s) => [s.post_id, s]));
  const myReactionById = new Map(
    (reactions ?? []).map((r) => [r.post_id, r.kind as ReactionKind]),
  );
  const nameById = new Map(
    (profiles ?? []).map(
      (p) => [p.id, p.display_name ?? p.username ?? null] as const,
    ),
  );
  const followedSet = new Set((follows ?? []).map((f) => f.followed_id));
  const recipeById = new Map((recipes ?? []).map((r) => [r.id, r]));
  const groupById = new Map((groups ?? []).map((g) => [g.id, g]));

  return posts.map((post) => {
    const stat = statsById.get(post.id);
    const recipe = post.recipe_id ? recipeById.get(post.recipe_id) : undefined;
    const group = post.group_id ? groupById.get(post.group_id) : undefined;
    return {
      id: post.id,
      kind: post.kind,
      text: post.text,
      createdAt: post.created_at,
      authorId: post.author_id,
      authorName: nameById.get(post.author_id) ?? null,
      isOwn: post.author_id === currentUserId,
      moderation: post.moderation,
      groupName: group?.name ?? null,
      groupSlug: group?.slug ?? null,
      recipe: recipe
        ? { slug: recipe.slug, title: recipe.title, icon: recipe.icon }
        : null,
      stats: {
        bsahtek: stat?.bsahtek ?? 0,
        mabrouk: stat?.mabrouk ?? 0,
        yaouili: stat?.yaouili ?? 0,
        comments: stat?.comments ?? 0,
      },
      myReaction: myReactionById.get(post.id) ?? null,
      amFollowing: followedSet.has(post.author_id),
    };
  });
}
