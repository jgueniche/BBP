"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { foodRulesInputSchema } from "@/lib/diets/preferences";
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
    "recipe_likes",
    "recipe_saves",
    "recipe_notes",
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
  await supabase.from("post_comments").delete().eq("author_id", user.id);
  await supabase.from("posts").delete().eq("author_id", user.id);
  await supabase.from("follows").delete().eq("follower_id", user.id);
  await supabase.from("recipes").delete().eq("author_id", user.id);
  await supabase.from("collections").delete().eq("owner_id", user.id);
  await supabase.from("profiles").delete().eq("id", user.id);

  await supabase.auth.signOut();
  redirect("/login");
}
