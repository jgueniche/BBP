"use server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** Unread notification groups, for the badges (0 when signed out). */
export async function getUnreadCount(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const supabase = await createClient();
  const { data } = await supabase.rpc("unread_notification_count");
  return typeof data === "number" ? data : 0;
}

/**
 * Opening the inbox marks everything as seen. No revalidation: the page keeps
 * its « Nouveau » section for this visit, the badges clear on the client.
 */
export async function markNotificationsSeen() {
  if (!isSupabaseConfigured) return { ok: false as const };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };
  const { error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, notifications_seen_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  return { ok: !error };
}
