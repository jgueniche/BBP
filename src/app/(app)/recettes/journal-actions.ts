"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { runModeration } from "@/ai/agents/moderator";
import { isValidCookedOn } from "@/lib/journal/journal";
import { recordCook } from "@/lib/journal/server";
import { pushNotification } from "@/lib/notifications/push";
import { isOwnPhotoPath, MAX_POST_PHOTOS } from "@/lib/social/photos";
import { createClient } from "@/lib/supabase/server";
import { todayIn } from "@/lib/utils/local-date";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

const cookSchema = z.object({
  recipeId: z.uuid(),
  cookedOn: z.string().max(10),
  text: z.string().trim().max(1000),
  share: z.boolean(),
  photoPaths: z.array(z.string().max(120)).max(MAX_POST_PHOTOS).default([]),
});

export type LogCookResult =
  | { ok: true; shared: boolean; flagged: boolean }
  | { ok: false; code: "date" | "moderation" | "error"; reasons?: string[] };

function revalidateCooking(slug: string | null) {
  revalidatePath("/recettes");
  revalidatePath("/recettes/journal");
  if (slug) revalidatePath(`/recettes/${slug}`);
}

/**
 * « J'ai cuisiné »: always a private journal entry; « Partager » also posts
 * it (photos only with a post: the photo bucket is public).
 */
export async function logCook(
  raw: z.input<typeof cookSchema>,
): Promise<LogCookResult> {
  const input = cookSchema.parse(raw);
  const { supabase, user } = await requireUser();
  if (!isValidCookedOn(input.cookedOn, todayIn())) {
    return { ok: false, code: "date" };
  }
  if (!input.share && input.photoPaths.length > 0) {
    return { ok: false, code: "error" };
  }
  if (!input.photoPaths.every((path) => isOwnPhotoPath(path, user.id))) {
    return { ok: false, code: "error" };
  }
  const note = input.text.length > 0 ? input.text : null;

  if (!input.share) {
    const cooked = await recordCook(supabase, user.id, {
      recipeId: input.recipeId,
      cookedOn: input.cookedOn,
      note,
      postId: null,
    });
    if (!cooked.ok) return { ok: false, code: "error" };
    revalidateCooking(cooked.recipeSlug);
    return { ok: true, shared: false, flagged: false };
  }

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id")
    .eq("id", input.recipeId)
    .maybeSingle();
  if (!recipe) return { ok: false, code: "error" };
  const verdict = note
    ? await runModeration(note)
    : { allow: true as const, severity: "none" as const, reasons: [] };
  if (!verdict.allow) {
    return { ok: false, code: "moderation", reasons: verdict.reasons };
  }
  const flagged = verdict.severity === "medium";
  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      kind: "cooked",
      text: note,
      recipe_id: input.recipeId,
      photo_paths: input.photoPaths,
      visibility: "community",
      moderation: flagged ? "flagged" : "ok",
      moderation_reasons: verdict.reasons,
    })
    .select("id")
    .single();
  if (error) return { ok: false, code: "error" };

  const cooked = await recordCook(supabase, user.id, {
    recipeId: input.recipeId,
    cookedOn: input.cookedOn,
    note,
    postId: post.id,
  });
  if (!cooked.ok) {
    // No post without its journal entry.
    await supabase.from("posts").delete().eq("id", post.id);
    return { ok: false, code: "error" };
  }
  if (!flagged && cooked.authorId) {
    const recipient = cooked.authorId;
    after(() =>
      pushNotification({
        kind: "cooked",
        recipientId: recipient,
        actorId: user.id,
        recipeId: input.recipeId,
      }),
    );
  }
  revalidateCooking(cooked.recipeSlug);
  revalidatePath("/communaute");
  return { ok: true, shared: true, flagged };
}

/** Removes a journal entry; a shared post stays online. */
export async function deleteCookLog(entryId: string) {
  const id = z.uuid().parse(entryId);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("cook_logs").delete().eq("id", id);
  revalidatePath("/recettes/journal");
  revalidatePath("/recettes/[slug]", "page");
  return { ok: !error };
}

/** Adds a recipe to « À cuisiner », or takes it out. */
export async function toggleToCook(recipeId: string) {
  const rid = z.uuid().parse(recipeId);
  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("to_cook")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_id", rid)
    .maybeSingle();
  if (existing) {
    await supabase.from("to_cook").delete().eq("id", existing.id);
    revalidatePath("/recettes");
    return { ok: true as const, inList: false };
  }
  const { error } = await supabase
    .from("to_cook")
    .insert({ user_id: user.id, recipe_id: rid, source: "manual" });
  revalidatePath("/recettes");
  return { ok: !error, inList: !error };
}
