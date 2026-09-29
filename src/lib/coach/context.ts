import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";

const MAX_MEMORIES = 40;

export type CoachContext = {
  userContext: string;
  memories: string;
  displayName: string | null;
};

/**
 * What the assistant knows about the person: first name, the cooking rules
 * they opted into, and the memories they can review and delete.
 */
export async function buildCoachContext(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CoachContext> {
  const [profileRes, settingsRes, memoriesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_settings")
      .select(
        "kashrut_enabled, meat_to_dairy_wait_hours, no_fish_with_meat, kitniyot",
      )
      .maybeSingle(),
    supabase
      .from("coach_memories")
      .select("content")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(MAX_MEMORIES),
  ]);

  const profile = profileRes.data;
  const settings = settingsRes.data;

  const parts: string[] = [];
  if (profile?.display_name) parts.push(`Prénom : ${profile.display_name}.`);
  if (settings?.kashrut_enabled) {
    const rules = [
      `pas de viande et de lait au même repas, délai viande → lait ${settings.meat_to_dairy_wait_hours} h`,
    ];
    if (settings.no_fish_with_meat) rules.push("pas de poisson avec la viande");
    rules.push(
      settings.kitniyot
        ? "légumineuses autorisées à Pessah"
        : "pas de légumineuses à Pessah",
    );
    parts.push(`Règles de cuisine choisies : casher (${rules.join(", ")}).`);
  } else {
    parts.push("Aucune règle alimentaire particulière déclarée.");
  }

  const memories = (memoriesRes.data ?? [])
    .map((m) => `- ${m.content}`)
    .join("\n");

  return {
    userContext: parts.join(" "),
    memories,
    displayName: profile?.display_name ?? null,
  };
}
