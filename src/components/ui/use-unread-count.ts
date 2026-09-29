"use client";

import { useEffect, useState } from "react";

import { getUnreadCount } from "@/app/(app)/notifications/actions";

export const NOTIFICATIONS_SEEN_EVENT = "copine:notifications-seen";

const REFRESH_EVERY_MS = 60_000;

/**
 * Unread badge: rendered by the server, cleared when the inbox is opened,
 * refreshed when the app comes back to the foreground (at most once a
 * minute). No polling in the background: notifications stay sober.
 */
export function useUnreadCount(initial: number): number {
  const [count, setCount] = useState(initial);

  useEffect(() => setCount(initial), [initial]);

  useEffect(() => {
    let last = Date.now();
    const onSeen = () => setCount(0);
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - last < REFRESH_EVERY_MS) return;
      last = Date.now();
      try {
        setCount(await getUnreadCount());
      } catch {
        // Offline: keep the last known count.
      }
    };
    window.addEventListener(NOTIFICATIONS_SEEN_EVENT, onSeen);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener(NOTIFICATIONS_SEEN_EVENT, onSeen);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return count;
}
