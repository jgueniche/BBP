import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/db/types";

import { supabaseAnonKey, supabaseUrl } from "./config";

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
