"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

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
