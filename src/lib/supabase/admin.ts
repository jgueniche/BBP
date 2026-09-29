import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";

import { isSupabaseConfigured, supabaseUrl } from "./config";

/**
 * Service-role client for server jobs that act for someone else (a push to
 * the author of a recipe). Bypasses RLS: never reachable from the browser,
 * never fed with unchecked ids. Null when the key is not configured.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isSupabaseConfigured || !key) return null;
  return createSupabaseClient<Database>(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
