"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

import { deletePushSubscription, savePushSubscription } from "./push-actions";

const t = fr.notifications.card;

type PushState =
  "loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function NotificationsCard({
  vapidPublicKey,
}: {
  vapidPublicKey: string | null;
}) {
  const [state, setState] = useState<PushState>("loading");
  const [pending, setPending] = useState(false);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    if (!supported) {
      setState("unsupported");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.getSubscription();
        if (cancelled) return;
        if (subscription) setState("subscribed");
        else if (Notification.permission === "denied") setState("denied");
        else setState("unsubscribed");
      } catch {
        if (!cancelled) setState("unsupported");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported]);

  async function subscribe() {
    if (!vapidPublicKey) return;
    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
          .buffer as ArrayBuffer,
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        throw new Error("incomplete subscription");
      }
      const result = await savePushSubscription({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });
      if (!result.ok) throw new Error("save failed");
      setState("subscribed");
      toast(t.enabled);
    } catch {
      toast(t.error);
    } finally {
      setPending(false);
    }
  }

  // DoD: unsubscribing is a single click — browser and server side together.
  async function unsubscribe() {
    setPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("unsubscribed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[20px] border-2 border-ink bg-paper p-4 shadow-sticker">
      <p className="flex items-center gap-2 font-display text-lg font-extrabold">
        <Bell size={18} strokeWidth={2} aria-hidden />
        {t.title}
      </p>
      <p className="mt-1 text-xs text-ink-50">{t.intro}</p>

      <div className="mt-3">
        {!vapidPublicKey ? (
          <p className="text-sm text-ink-70">{t.notConfigured}</p>
        ) : state === "loading" ? null : state === "unsupported" ? (
          <p className="text-sm text-ink-70">{t.unsupported}</p>
        ) : state === "denied" ? (
          <p className="text-sm text-ink-70">{t.denied}</p>
        ) : state === "subscribed" ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ok">{t.enabled}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={unsubscribe}
              disabled={pending}
            >
              <BellOff />
              {t.disable}
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={subscribe}
            disabled={pending}
          >
            <Bell />
            {t.enable}
          </Button>
        )}
      </div>
    </div>
  );
}
