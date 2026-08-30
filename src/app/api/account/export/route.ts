import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const [profile, settings, health, goals, weights, foodLogs, favorites] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_settings").select("*").maybeSingle(),
      supabase.from("health_profile").select("*").maybeSingle(),
      supabase.from("goals").select("*").order("created_at"),
      supabase.from("weight_logs").select("*").order("date"),
      supabase.from("food_logs").select("*").order("date"),
      supabase.from("food_favorites").select("*"),
    ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    profile: profile.data,
    user_settings: settings.data,
    health_profile: health.data,
    goals: goals.data,
    weight_logs: weights.data,
    food_logs: foodLogs.data,
    food_favorites: favorites.data,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="bbp-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
