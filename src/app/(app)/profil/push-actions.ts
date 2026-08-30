"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(10).max(400),
  auth: z.string().min(5).max(200),
});

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function savePushSubscription(raw: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const parsed = subscriptionSchema.parse(raw);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.endpoint,
      p256dh: parsed.p256dh,
      auth: parsed.auth,
    },
    { onConflict: "endpoint" },
  );
  return { ok: !error };
}

export async function deletePushSubscription(rawEndpoint: string) {
  const endpoint = z.string().url().max(1000).parse(rawEndpoint);
  const { supabase } = await requireUser();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true as const };
}
