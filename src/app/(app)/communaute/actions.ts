"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runModeration } from "@/ai/agents/moderator";
import { slugify } from "@/lib/utils/slug";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

const postSchema = z.object({
  text: z.string().min(2).max(1000),
  kind: z.enum(["text", "recipe", "progress", "shabbat_plate", "workout"]),
  recipeId: z.uuid().nullable(),
  groupId: z.uuid().nullable(),
});

export type CreatePostResult =
  | { ok: true; flagged: boolean }
  | { ok: false; code: "moderation"; reasons: string[] }
  | { ok: false; code: "error" };

export async function createPost(
  raw: z.infer<typeof postSchema>,
): Promise<CreatePostResult> {
  const input = postSchema.parse(raw);
  const { supabase, user } = await requireUser();

  const verdict = await runModeration(input.text);
  if (!verdict.allow) {
    return { ok: false, code: "moderation", reasons: verdict.reasons };
  }

  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    kind: input.kind,
    text: input.text,
    recipe_id: input.recipeId,
    group_id: input.groupId,
    visibility: "community",
    moderation: verdict.severity === "medium" ? "flagged" : "ok",
    moderation_reasons: verdict.reasons,
  });
  if (error) return { ok: false, code: "error" };

  revalidatePath("/communaute");
  return { ok: true, flagged: verdict.severity === "medium" };
}

export async function deletePost(postId: string) {
  const id = z.uuid().parse(postId);
  const { supabase } = await requireUser();
  await supabase.from("posts").delete().eq("id", id);
  revalidatePath("/communaute");
  return { ok: true as const };
}

export type PostCommentItem = {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  authorName: string | null;
};

export async function getPostComments(
  postId: string,
): Promise<PostCommentItem[]> {
  const id = z.uuid().parse(postId);
  const { supabase } = await requireUser();
  const { data: comments } = await supabase
    .from("post_comments")
    .select("id, text, created_at, author_id")
    .eq("post_id", id)
    .neq("moderation", "blocked")
    .order("created_at")
    .limit(100);
  const authorIds = [...new Set((comments ?? []).map((c) => c.author_id))];
  const { data: profiles } =
    authorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", authorIds)
      : { data: [] };
  const names = new Map(
    (profiles ?? []).map(
      (p) => [p.id, p.display_name ?? p.username ?? null] as const,
    ),
  );
  return (comments ?? []).map((comment) => ({
    ...comment,
    authorName: names.get(comment.author_id) ?? null,
  }));
}

export async function addPostComment(postId: string, rawText: string) {
  const id = z.uuid().parse(postId);
  const text = z.string().min(1).max(500).parse(rawText.trim());
  const { supabase, user } = await requireUser();

  const verdict = await runModeration(text);
  if (!verdict.allow) {
    return { ok: false as const, code: "moderation" as const };
  }
  const { data, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: id,
      author_id: user.id,
      text,
      moderation: verdict.severity === "medium" ? "flagged" : "ok",
      moderation_reasons: verdict.reasons,
    })
    .select("id, text, created_at, author_id")
    .single();
  if (error) return { ok: false as const, code: "error" as const };
  return { ok: true as const, comment: data };
}

export async function deletePostComment(commentId: string) {
  const id = z.uuid().parse(commentId);
  const { supabase } = await requireUser();
  await supabase.from("post_comments").delete().eq("id", id);
  return { ok: true as const };
}

export async function setReaction(
  postId: string,
  kind: "bsahtek" | "mabrouk" | "yaouili" | null,
) {
  const id = z.uuid().parse(postId);
  const { supabase, user } = await requireUser();
  if (kind === null) {
    await supabase
      .from("post_reactions")
      .delete()
      .eq("post_id", id)
      .eq("user_id", user.id);
    return { ok: true as const };
  }
  const { error } = await supabase
    .from("post_reactions")
    .upsert(
      { post_id: id, user_id: user.id, kind },
      { onConflict: "post_id,user_id" },
    );
  return { ok: !error };
}

export async function toggleFollow(userId: string) {
  const followed = z.uuid().parse(userId);
  const { supabase, user } = await requireUser();
  if (followed === user.id) return { ok: false as const, following: false };
  const { data: existing } = await supabase
    .from("follows")
    .select("followed_id")
    .eq("follower_id", user.id)
    .eq("followed_id", followed)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followed_id", followed);
    revalidatePath("/communaute");
    return { ok: true as const, following: false };
  }
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, followed_id: followed });
  revalidatePath("/communaute");
  return { ok: !error, following: true };
}

export async function blockUser(userId: string) {
  const blocked = z.uuid().parse(userId);
  const { supabase, user } = await requireUser();
  if (blocked === user.id) return { ok: false as const };
  await supabase
    .from("blocks")
    .upsert(
      { blocker_id: user.id, blocked_id: blocked },
      { onConflict: "blocker_id,blocked_id" },
    );
  // Blocking also unfollows, both directions of interest for the blocker.
  await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("followed_id", blocked);
  revalidatePath("/communaute");
  return { ok: true as const };
}

export async function reportContent(params: {
  targetKind: "post" | "comment";
  targetId: string;
  reason: string;
}) {
  const targetId = z.uuid().parse(params.targetId);
  const reason = z.string().min(3).max(300).parse(params.reason.trim());
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_kind: params.targetKind === "comment" ? "comment" : "post",
    target_id: targetId,
    reason,
  });
  return { ok: !error };
}

const groupSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(300).nullable(),
  icon: z.string().min(1).max(8),
});

export async function createGroup(raw: z.infer<typeof groupSchema>) {
  const input = groupSchema.parse(raw);
  const { supabase, user } = await requireUser();

  const verdict = await runModeration(
    `${input.name} ${input.description ?? ""}`,
  );
  if (!verdict.allow) return { ok: false as const };

  const base = slugify(input.name);
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase
    .from("groups")
    .insert({
      slug,
      name: input.name,
      description: input.description,
      icon: input.icon,
      created_by: user.id,
    })
    .select("id, slug")
    .single();
  if (error) return { ok: false as const };
  await supabase
    .from("group_members")
    .insert({ group_id: data.id, user_id: user.id, role: "admin" });
  revalidatePath("/communaute");
  return { ok: true as const, slug: data.slug };
}

export async function joinGroup(groupId: string) {
  const id = z.uuid().parse(groupId);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("group_members")
    .upsert(
      { group_id: id, user_id: user.id },
      { onConflict: "group_id,user_id" },
    );
  revalidatePath("/communaute");
  return { ok: !error };
}

export async function leaveGroup(groupId: string) {
  const id = z.uuid().parse(groupId);
  const { supabase, user } = await requireUser();
  await supabase
    .from("group_members")
    .delete()
    .eq("group_id", id)
    .eq("user_id", user.id);
  revalidatePath("/communaute");
  return { ok: true as const };
}
