"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Open a fresh Kémia thread and land on it. */
export async function startConversation() {
  const { supabase, user } = await requireUser();
  const { data: created, error } = await supabase
    .from("coach_conversations")
    .insert({ user_id: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/coach");
  redirect(`/coach?c=${created.id}`);
}

export async function deleteConversation(rawId: string) {
  const id = z.uuid().parse(rawId);
  const { supabase, user } = await requireUser();
  await supabase
    .from("coach_messages")
    .delete()
    .eq("conversation_id", id)
    .eq("user_id", user.id);
  await supabase
    .from("coach_conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/coach");
  redirect("/coach");
}
