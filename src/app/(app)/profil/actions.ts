"use server";

import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function deleteAccountData() {
  if (!isSupabaseConfigured) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS restricts every delete to the current user's rows.
  await supabase.from("food_logs").delete().eq("user_id", user.id);
  await supabase.from("food_favorites").delete().eq("user_id", user.id);
  await supabase.from("weight_logs").delete().eq("user_id", user.id);
  await supabase.from("goals").delete().eq("user_id", user.id);
  await supabase.from("health_profile").delete().eq("user_id", user.id);
  await supabase.from("user_settings").delete().eq("user_id", user.id);
  await supabase.from("foods").delete().eq("user_id", user.id);
  await supabase.from("profiles").delete().eq("id", user.id);

  await supabase.auth.signOut();
  redirect("/login");
}
