"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { runModeration } from "@/ai/agents/moderator";
import { foodRulesInputSchema } from "@/lib/diets/preferences";
import { readPushPrefs, type PushKind } from "@/lib/notifications/push-rules";
import { AVATAR_BUCKET, isOwnAvatarPath } from "@/lib/social/avatars";
import { POST_PHOTO_BUCKET } from "@/lib/social/photos";
import { parseProfileInput } from "@/lib/social/profile";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function saveFoodRules(raw: {
  diets: string[];
  allergens: string[];
  dislikes: string[];
  consent: boolean;
}) {
  if (!isSupabaseConfigured)
    return { ok: false as const, code: "off" as const };
  const input = foodRulesInputSchema.parse(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: current } = await supabase
    .from("user_settings")
    .select("food_rules_consent_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const sensitive = input.diets.length + input.allergens.length > 0;
  const consentedAt =
    current?.food_rules_consent_at ??
    (input.consent ? new Date().toISOString() : null);
  // Explicit consent before any diet or allergy is stored (GDPR art. 9).
  if (sensitive && !consentedAt) {
    return { ok: false as const, code: "consent_required" as const };
  }

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      diets: [...new Set(input.diets)],
      allergens: [...new Set(input.allergens)],
      dislikes: [
        ...new Map(
          input.dislikes.map((word) => [word.toLowerCase(), word] as const),
        ).values(),
      ],
      food_rules_consent_at: consentedAt,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Withdraws the consent: every cooking rule is erased. */
export async function clearFoodRules() {
  if (!isSupabaseConfigured) return { ok: false as const };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      diets: [],
      allergens: [],
      dislikes: [],
      food_rules_consent_at: null,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function updateProfileVisibility(publicProfile: boolean) {
  if (!isSupabaseConfigured) return { ok: false as const };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ visibility: publicProfile === true ? "public" : "private" })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/profil");
  revalidatePath("/communaute");
  return { ok: true as const };
}

export type SaveProfileResult =
  | { ok: true; handle: string | null }
  | {
      ok: false;
      field?: "displayName" | "handle" | "bio";
      code:
        | "required"
        | "length"
        | "format"
        | "reserved"
        | "taken"
        | "moderation"
        | "error";
    };

/** Name, @handle and bio of « Mon profil », moderated like any public text. */
export async function saveProfile(raw: {
  displayName: string;
  handle: string;
  bio: string;
}): Promise<SaveProfileResult> {
  if (!isSupabaseConfigured) return { ok: false, code: "error" };
  const parsed = parseProfileInput(raw);
  if (!parsed.ok) {
    return { ok: false, field: parsed.field, code: parsed.reason };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { displayName, handle, bio } = parsed.value;
  // A bio has no review queue: sensitive content is refused, not flagged.
  const verdict = await runModeration(
    [displayName, handle ?? "", bio ?? ""].join("\n"),
  );
  if (!verdict.allow || verdict.severity !== "none") {
    return { ok: false, code: "moderation" };
  }
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, username: handle, bio })
    .eq("id", user.id);
  if (error?.code === "23505") {
    return { ok: false, field: "handle", code: "taken" };
  }
  if (error) return { ok: false, code: "error" };
  revalidatePath("/profil");
  revalidatePath("/communaute", "layout");
  return { ok: true, handle };
}

async function removeOtherAvatars(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  keep: string | null,
) {
  const { data: files } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(userId, { limit: 100 });
  const stale = (files ?? [])
    .map((file) => `${userId}/${file.name}`)
    .filter((path) => path !== keep);
  if (stale.length > 0) {
    await supabase.storage.from(AVATAR_BUCKET).remove(stale);
  }
}

/** Uses the photo just uploaded to my folder; older ones are deleted. */
export async function setAvatar(rawPath: string) {
  if (!isSupabaseConfigured) return { ok: false as const };
  const path = z.string().max(120).parse(rawPath);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnAvatarPath(path, user.id)) return { ok: false as const };
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: path })
    .eq("id", user.id);
  if (error) return { ok: false as const };
  await removeOtherAvatars(supabase, user.id, path);
  revalidatePath("/profil");
  revalidatePath("/communaute", "layout");
  return { ok: true as const };
}

export async function removeAvatar() {
  if (!isSupabaseConfigured) return { ok: false as const };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);
  await removeOtherAvatars(supabase, user.id, null);
  revalidatePath("/profil");
  revalidatePath("/communaute", "layout");
  return { ok: true as const };
}

/** One push preference (« M'avertir quand… »). */
export async function setPushPreference(kind: PushKind, enabled: boolean) {
  if (!isSupabaseConfigured) return { ok: false as const };
  const parsedKind = z.enum(["cooked", "tip", "follow", "comment"]).parse(kind);
  const on = z.boolean().parse(enabled);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: settings } = await supabase
    .from("user_settings")
    .select("notif_prefs")
    .eq("user_id", user.id)
    .maybeSingle();
  const current = settings?.notif_prefs;
  const others =
    current && typeof current === "object" && !Array.isArray(current)
      ? current
      : {};
  const push = { ...readPushPrefs(current), [parsedKind]: on };
  const { error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, notif_prefs: { ...others, push } },
      { onConflict: "user_id" },
    );
  return { ok: !error };
}

export async function deleteAccountData() {
  if (!isSupabaseConfigured) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS restricts every delete to the current user's rows. Children go first;
  // recipes, collections, plans and conversations cascade to their rows.
  const byUser = [
    "cook_logs",
    "to_cook",
    "recipe_likes",
    "recipe_saves",
    "recipe_notes",
    "recipe_comment_votes",
    "recipe_comments",
    "post_reactions",
    "collection_members",
    "group_members",
    "coach_memories",
    "coach_conversations",
    "meal_plans",
    "push_subscriptions",
    "user_settings",
    "foods",
  ] as const;
  for (const table of byUser) {
    await supabase.from(table).delete().eq("user_id", user.id);
  }
  // Post and profile photos live in the person's own storage folders.
  const { data: photos } = await supabase.storage
    .from(POST_PHOTO_BUCKET)
    .list(user.id, { limit: 1000 });
  if (photos && photos.length > 0) {
    await supabase.storage
      .from(POST_PHOTO_BUCKET)
      .remove(photos.map((photo) => `${user.id}/${photo.name}`));
  }
  await removeOtherAvatars(supabase, user.id, null);
  await supabase.from("post_comments").delete().eq("author_id", user.id);
  await supabase.from("posts").delete().eq("author_id", user.id);
  await supabase.from("follows").delete().eq("follower_id", user.id);
  await supabase.from("follows").delete().eq("followed_id", user.id);
  await supabase.from("blocks").delete().eq("blocker_id", user.id);
  await supabase.from("recipes").delete().eq("author_id", user.id);
  await supabase.from("collections").delete().eq("owner_id", user.id);
  await supabase.from("profiles").delete().eq("id", user.id);

  await supabase.auth.signOut();
  redirect("/login");
}
