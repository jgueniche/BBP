"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export async function createConversation() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("coach_conversations")
    .insert({ user_id: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/coach");
  redirect(`/coach?c=${data.id}`);
}

export async function deleteConversation(id: string) {
  const conversationId = z.uuid().parse(id);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("coach_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", user.id);
  revalidatePath("/coach");
}
