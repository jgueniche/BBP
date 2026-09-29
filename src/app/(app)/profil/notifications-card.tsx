"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { fr } from "@/i18n/fr";
import {
  PUSH_KINDS,
  type PushKind,
  type PushPrefs,
} from "@/lib/notifications/push-rules";
import { SW_SCOPE, SW_URL } from "@/lib/pwa/sw";

import { setPushPreference } from "./actions";
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
  initialPrefs,
}: {
  vapidPublicKey: string | null;
  initialPrefs: PushPrefs;
}) {
  const [state, setState] = useState<PushState>("loading");
  const [pending, setPending] = useState(false);
  const [prefs, setPrefs] = useState(initialPrefs);

  async function onPref(kind: PushKind, next: boolean) {
    setPrefs((current) => ({ ...current, [kind]: next }));
    const result = await setPushPreference(kind, next);
    if (!result.ok) setPrefs((current) => ({ ...current, [kind]: !next }));
  }

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
        // The Serwist provider registers the worker in production; outside
        // of it (dev, or before the provider ran) register the same script
        // at the same scope so the push subscription stays attached.
        const registration =
          (await navigator.serviceWorker.getRegistration(SW_SCOPE)) ??
          (await navigator.serviceWorker.register(SW_URL, {
            scope: SW_SCOPE,
            type: "module",
          }));
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
    <div id="notifications" className="scroll-mt-6 rounded-lg bg-ciel p-4">
      <p className="flex items-center gap-2 font-display text-lg font-semibold">
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

      {vapidPublicKey && state === "subscribed" && (
        <div className="mt-4 border-t border-ink-10 pt-3">
          <p className="text-sm font-semibold">{t.prefsTitle}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {PUSH_KINDS.map((kind) => (
              <li
                key={kind}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>{t.prefs[kind]}</span>
                <Switch
                  checked={prefs[kind]}
                  onChange={(next) => onPref(kind, next)}
                  label={t.prefs[kind]}
                />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-ink-50">{t.reactionsNote}</p>
        </div>
      )}
    </div>
  );
}
