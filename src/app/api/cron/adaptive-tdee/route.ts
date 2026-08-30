import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import type { Database } from "@/db/types";
import { maybeGenerateTdeeProposal } from "@/lib/nutrition/proposals";
import { supabaseUrl } from "@/lib/supabase/config";

export const maxDuration = 300;

// Weekly adaptive-TDEE run (brief §4.4, Sunday evening). Also computed lazily
// per user on /poids visits, so this cron is a catch-up, not a hard dependency.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json(
      {
        error: "service role key not configured; lazy per-user generation only",
      },
      { status: 501 },
    );
  }

  const supabase = createServiceClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: goals } = await supabase
    .from("goals")
    .select("user_id")
    .eq("status", "active");

  const userIds = [...new Set((goals ?? []).map((g) => g.user_id))];
  let processed = 0;
  for (const userId of userIds) {
    try {
      await maybeGenerateTdeeProposal(supabase, userId);
      processed += 1;
    } catch (error) {
      console.error("adaptive_tdee failed for user", userId, error);
    }
  }

  return NextResponse.json({ users: userIds.length, processed });
}
