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

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function logWeight(date: string, weightKg: number) {
  const cleanDate = dateSchema.parse(date);
  const weight = z.number().min(20).max(500).parse(weightKg);
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("weight_logs")
    .upsert(
      {
        user_id: user.id,
        date: cleanDate,
        weight_kg: weight,
        source: "manual",
      },
      { onConflict: "user_id,date" },
    );
  if (error) throw new Error(error.message);

  revalidatePath("/poids");
  return { ok: true as const };
}

const measurementsSchema = z.object({
  waist_cm: z.number().min(30).max(300).nullable(),
  hips_cm: z.number().min(30).max(300).nullable(),
  chest_cm: z.number().min(30).max(300).nullable(),
  arm_cm: z.number().min(10).max(100).nullable(),
  thigh_cm: z.number().min(20).max(150).nullable(),
});

export async function logMeasurements(
  date: string,
  values: z.infer<typeof measurementsSchema>,
) {
  const cleanDate = dateSchema.parse(date);
  const clean = measurementsSchema.parse(values);
  if (Object.values(clean).every((v) => v === null)) {
    return { ok: false as const };
  }
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("body_measurements")
    .upsert(
      { user_id: user.id, date: cleanDate, ...clean },
      { onConflict: "user_id,date" },
    );
  if (error) throw new Error(error.message);

  revalidatePath("/poids");
  return { ok: true as const };
}

export async function acceptTdeeProposal(id: string) {
  const proposalId = z.uuid().parse(id);
  const { supabase, user } = await requireUser();

  const { data: proposal } = await supabase
    .from("tdee_proposals")
    .select("*")
    .eq("id", proposalId)
    .eq("status", "pending")
    .maybeSingle();
  if (!proposal) throw new Error("Proposal not found");

  const { data: goal } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!goal) throw new Error("No active goal");

  // Goals are historised (brief §7): archive the current one, insert the update.
  await supabase.from("goals").update({ status: "archived" }).eq("id", goal.id);

  const { error: insertError } = await supabase.from("goals").insert({
    user_id: user.id,
    type: goal.type,
    target_weight_kg: goal.target_weight_kg,
    weekly_rate_pct: goal.weekly_rate_pct,
    calorie_target: proposal.new_calorie_target,
    protein_target_g: goal.protein_target_g,
    activity_level: goal.activity_level,
    tdee_estimate: proposal.new_tdee,
  });
  if (insertError) throw new Error(insertError.message);

  await supabase
    .from("tdee_proposals")
    .update({ status: "accepted" })
    .eq("id", proposalId);

  revalidatePath("/poids");
  revalidatePath("/journal");
  return { ok: true as const };
}

export async function dismissTdeeProposal(id: string) {
  const proposalId = z.uuid().parse(id);
  const { supabase } = await requireUser();
  await supabase
    .from("tdee_proposals")
    .update({ status: "dismissed" })
    .eq("id", proposalId);
  revalidatePath("/poids");
  return { ok: true as const };
}
