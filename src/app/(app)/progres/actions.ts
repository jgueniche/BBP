"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { minHealthyTargetKg } from "@/lib/nutrition/goal-plan";
import { createClient } from "@/lib/supabase/server";

const slugSchema = z.string().regex(/^[a-z0-9-]{2,60}$/);

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function joinChallenge(rawSlug: string) {
  const slug = slugSchema.parse(rawSlug);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("challenge_participants")
    .upsert(
      { challenge_slug: slug, user_id: user.id },
      { onConflict: "challenge_slug,user_id" },
    );
  revalidatePath("/progres");
  return { ok: !error };
}

const targetWeightSchema = z.number().min(30).max(300);

/**
 * Update the active goal's target weight. Guardrail (brief §3): the target
 * never goes below a BMI of 18.5 for the profile's height.
 */
export async function updateTargetWeight(rawTarget: number) {
  const parsed = targetWeightSchema.safeParse(rawTarget);
  if (!parsed.success)
    return { ok: false as const, reason: "invalid" as const };
  const { supabase, user } = await requireUser();

  const [{ data: goal }, { data: profile }] = await Promise.all([
    supabase
      .from("goals")
      .select("id, target_weight_kg")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("height_cm")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  // No editable target in general-accompaniment mode (no numbers there).
  if (!goal || goal.target_weight_kg === null) {
    return { ok: false as const, reason: "invalid" as const };
  }
  if (profile?.height_cm) {
    const floor = minHealthyTargetKg(profile.height_cm);
    if (parsed.data < floor) {
      return { ok: false as const, reason: "too_low" as const, floor };
    }
  }

  const { error } = await supabase
    .from("goals")
    .update({ target_weight_kg: parsed.data })
    .eq("id", goal.id);
  if (error) return { ok: false as const, reason: "error" as const };

  revalidatePath("/progres");
  revalidatePath("/accueil");
  return { ok: true as const };
}

export async function leaveChallenge(rawSlug: string) {
  const slug = slugSchema.parse(rawSlug);
  const { supabase, user } = await requireUser();
  await supabase
    .from("challenge_participants")
    .delete()
    .eq("challenge_slug", slug)
    .eq("user_id", user.id);
  revalidatePath("/progres");
  return { ok: true as const };
}
