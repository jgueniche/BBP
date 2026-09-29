import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";
import { describeRulesForCoach } from "@/lib/diets/describe";
import { loadStoredFoodRules } from "@/lib/diets/preferences";

const MAX_MEMORIES = 40;

export type CoachContext = {
  userContext: string;
  memories: string;
  displayName: string | null;
};

/**
 * What the assistant knows about the person: first name, the cooking rules
 * they opted into (with consent), and the memories they can review.
 */
export async function buildCoachContext(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CoachContext> {
  const [profileRes, rules, memoriesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle(),
    loadStoredFoodRules(supabase, userId),
    supabase
      .from("coach_memories")
      .select("content")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(MAX_MEMORIES),
  ]);

  const profile = profileRes.data;
  const parts: string[] = [];
  if (profile?.display_name) parts.push(`Prénom : ${profile.display_name}.`);
  parts.push(describeRulesForCoach(rules));

  const memories = (memoriesRes.data ?? [])
    .map((m) => `- ${m.content}`)
    .join("\n");

  return {
    userContext: parts.join(" "),
    memories,
    displayName: profile?.display_name ?? null,
  };
}

/** Today's date in French (Paris time) for the assistant's prompt. */
export function todayForCoach(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(now);
}
