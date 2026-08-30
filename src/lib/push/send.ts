import "server-only";

import webpush from "web-push";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:contact@bbp.example";

/** Push is optional infrastructure — everything degrades without the keys. */
export const isPushConfigured = Boolean(publicKey && privateKey);

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

let vapidReady = false;

function ensureVapid(): boolean {
  if (!publicKey || !privateKey) return false;
  if (!vapidReady) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidReady = true;
  }
  return true;
}

/**
 * Send one payload to one browser subscription.
 * "gone" means the subscription is dead and should be deleted.
 */
export async function sendPush(
  subscription: PushSubscriptionRow,
  payload: PushPayload,
): Promise<"sent" | "gone" | "error"> {
  if (!ensureVapid()) return "error";
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 12 * 3600 },
    );
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("web-push send failed", status);
    return "error";
  }
}
