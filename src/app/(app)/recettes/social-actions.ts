"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function toggleLike(recipeId: string) {
  const rid = z.uuid().parse(recipeId);
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("recipe_likes")
    .select("recipe_id")
    .eq("recipe_id", rid)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("recipe_likes")
      .delete()
      .eq("recipe_id", rid)
      .eq("user_id", user.id);
    return { ok: true as const, liked: false };
  }
  const { error } = await supabase
    .from("recipe_likes")
    .insert({ recipe_id: rid, user_id: user.id });
  if (error) return { ok: false as const, liked: false };
  return { ok: true as const, liked: true };
}

export async function toggleSave(recipeId: string) {
  const rid = z.uuid().parse(recipeId);
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("recipe_saves")
    .select("recipe_id")
    .eq("recipe_id", rid)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("recipe_saves")
      .delete()
      .eq("recipe_id", rid)
      .eq("user_id", user.id);
    revalidatePath("/recettes");
    return { ok: true as const, saved: false };
  }
  const { error } = await supabase
    .from("recipe_saves")
    .insert({ recipe_id: rid, user_id: user.id });
  if (error) return { ok: false as const, saved: false };
  revalidatePath("/recettes");
  return { ok: true as const, saved: true };
}

export async function addComment(recipeId: string, text: string) {
  const rid = z.uuid().parse(recipeId);
  const body = z.string().min(1).max(500).parse(text.trim());
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("recipe_comments")
    .insert({ recipe_id: rid, user_id: user.id, text: body })
    .select("id, text, created_at, user_id")
    .single();
  if (error) throw new Error(error.message);
  return { ok: true as const, comment: data };
}

export async function deleteComment(commentId: string) {
  const cid = z.uuid().parse(commentId);
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("recipe_comments")
    .delete()
    .eq("id", cid);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

/** Upsert the caller's private note on a recipe; empty text deletes it. */
export async function saveNote(recipeId: string, text: string) {
  const rid = z.uuid().parse(recipeId);
  const body = z.string().max(2000).parse(text.trim());
  const { supabase, user } = await requireUser();

  if (body.length === 0) {
    await supabase
      .from("recipe_notes")
      .delete()
      .eq("recipe_id", rid)
      .eq("user_id", user.id);
    return { ok: true as const, deleted: true as const };
  }
  const { error } = await supabase
    .from("recipe_notes")
    .upsert(
      { recipe_id: rid, user_id: user.id, text: body },
      { onConflict: "user_id,recipe_id" },
    );
  if (error) throw new Error(error.message);
  return { ok: true as const, deleted: false as const };
}
