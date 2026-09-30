import "server-only";

import { APP_NAME } from "@/lib/brand";
import { isPushConfigured, sendPush } from "@/lib/push/send";
import { createAdminClient } from "@/lib/supabase/admin";

import { decidePush, readPushPrefs, type PushKind } from "./push-rules";
import { notificationText } from "./text";

export type PushEvent = {
  kind: PushKind;
  recipientId: string;
  actorId: string;
  recipeId?: string | null;
};

/**
 * Optional phone notification for something that just happened, run after
 * the response. The in-app inbox never depends on it: without VAPID or
 * service-role keys nothing is sent and nothing breaks.
 */
export async function pushNotification(event: PushEvent): Promise<void> {
  if (!isPushConfigured || event.recipientId === event.actorId) return;
  const admin = createAdminClient();
  if (!admin) return;
  try {
    const [settingsRes, subsRes, blockRes, recipientRes] = await Promise.all([
      admin
        .from("user_settings")
        .select("notif_prefs, push_sent_on, push_sent_count")
        .eq("user_id", event.recipientId)
        .maybeSingle(),
      admin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", event.recipientId),
      admin
        .from("blocks")
        .select("blocker_id")
        .eq("blocker_id", event.recipientId)
        .eq("blocked_id", event.actorId)
        .maybeSingle(),
      admin
        .from("profiles")
        .select("timezone")
        .eq("id", event.recipientId)
        .maybeSingle(),
    ]);
    const subscriptions = subsRes.data ?? [];
    if (blockRes.data || subscriptions.length === 0) return;

    const decision = decidePush({
      kind: event.kind,
      prefs: readPushPrefs(settingsRes.data?.notif_prefs),
      sentOn: settingsRes.data?.push_sent_on ?? null,
      sentCount: settingsRes.data?.push_sent_count ?? 0,
      now: new Date(),
      timeZone: recipientRes.data?.timezone,
    });
    if (!decision.send) return;

    const [actorRes, recipeRes] = await Promise.all([
      admin
        .from("profiles")
        .select("display_name, username, visibility")
        .eq("id", event.actorId)
        .maybeSingle(),
      event.recipeId
        ? admin
            .from("recipes")
            .select("title")
            .eq("id", event.recipeId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    // A private profile is never named, not even in a notification.
    const actor = actorRes.data;
    const name =
      actor?.visibility === "public"
        ? (actor.display_name ?? actor.username ?? null)
        : null;
    const body = notificationText(
      { kind: event.kind, actorIds: [event.actorId] },
      { nameOf: () => name, recipeTitle: recipeRes.data?.title ?? null },
    );

    // The daily cap is counted before sending.
    await admin.from("user_settings").upsert(
      {
        user_id: event.recipientId,
        push_sent_on: decision.day,
        push_sent_count: decision.count,
      },
      { onConflict: "user_id" },
    );
    for (const subscription of subscriptions) {
      const result = await sendPush(subscription, {
        title: APP_NAME,
        body,
        url: "/notifications",
      });
      if (result === "gone") {
        await admin
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
      }
    }
  } catch (error) {
    console.error("push notification failed", error);
  }
}
