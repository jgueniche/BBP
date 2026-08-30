"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { COLLECTION_COLORS } from "@/lib/collections/colors";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

const collectionSchema = z.object({
  id: z.uuid().nullable(),
  name: z.string().min(1).max(60),
  icon: z.string().min(1).max(8),
  color: z.enum(COLLECTION_COLORS),
  description: z.string().max(200).nullable(),
});

export type CollectionInput = z.infer<typeof collectionSchema>;

export async function saveCollection(raw: CollectionInput) {
  const input = collectionSchema.parse(raw);
  const { supabase, user } = await requireUser();

  if (input.id) {
    const { error } = await supabase
      .from("collections")
      .update({
        name: input.name,
        icon: input.icon,
        color: input.color,
        description: input.description,
      })
      .eq("id", input.id)
      .eq("owner_id", user.id);
    if (error) throw new Error(error.message);
    revalidatePath("/recettes/carnets");
    revalidatePath(`/recettes/carnets/${input.id}`);
    return { ok: true as const, id: input.id };
  }

  const { data, error } = await supabase
    .from("collections")
    .insert({
      owner_id: user.id,
      name: input.name,
      icon: input.icon,
      color: input.color,
      description: input.description,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/recettes/carnets");
  return { ok: true as const, id: data.id };
}

export async function deleteCollection(id: string) {
  const collectionId = z.uuid().parse(id);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId)
    .eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/recettes/carnets");
  return { ok: true as const };
}

export type CollectionForPicker = {
  id: string;
  name: string;
  icon: string;
  color: string;
  hasRecipe: boolean;
};

/** Collections the user can add to, with membership of the given recipe. */
export async function listCollectionsForRecipe(
  recipeId: string,
): Promise<CollectionForPicker[]> {
  const rid = z.uuid().parse(recipeId);
  const { supabase } = await requireUser();
  const [{ data: collections }, { data: links }] = await Promise.all([
    supabase
      .from("collections")
      .select("id, name, icon, color")
      .order("created_at"),
    supabase
      .from("collection_recipes")
      .select("collection_id")
      .eq("recipe_id", rid),
  ]);
  const linked = new Set((links ?? []).map((l) => l.collection_id));
  return (collections ?? []).map((c) => ({
    ...c,
    hasRecipe: linked.has(c.id),
  }));
}

export async function toggleRecipeInCollection(params: {
  collectionId: string;
  recipeId: string;
}) {
  const collectionId = z.uuid().parse(params.collectionId);
  const recipeId = z.uuid().parse(params.recipeId);
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("collection_recipes")
    .select("recipe_id")
    .eq("collection_id", collectionId)
    .eq("recipe_id", recipeId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("collection_recipes")
      .delete()
      .eq("collection_id", collectionId)
      .eq("recipe_id", recipeId);
    if (error) throw new Error(error.message);
    revalidatePath(`/recettes/carnets/${collectionId}`);
    return { ok: true as const, inCollection: false };
  }

  const { count } = await supabase
    .from("collection_recipes")
    .select("recipe_id", { count: "exact", head: true })
    .eq("collection_id", collectionId);
  const { error } = await supabase.from("collection_recipes").insert({
    collection_id: collectionId,
    recipe_id: recipeId,
    added_by: user.id,
    position: count ?? 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/recettes/carnets/${collectionId}`);
  return { ok: true as const, inCollection: true };
}

export async function joinCollectionByToken(token: string) {
  const parsed = z.uuid().safeParse(token);
  if (!parsed.success) return { ok: false as const };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("join_collection", {
    token: parsed.data,
  });
  if (error || !data) return { ok: false as const };
  revalidatePath("/recettes/carnets");
  return { ok: true as const, collectionId: data };
}

export async function leaveCollection(id: string) {
  const collectionId = z.uuid().parse(id);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("collection_members")
    .delete()
    .eq("collection_id", collectionId)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/recettes/carnets");
  return { ok: true as const };
}
