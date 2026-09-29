"use client";

import { useEffect } from "react";

import { NOTIFICATIONS_SEEN_EVENT } from "@/components/ui/use-unread-count";

import { markNotificationsSeen } from "./actions";

/** Runs once the inbox is on screen, so the badges clear everywhere. */
export function MarkSeen({ hasUnread }: { hasUnread: boolean }) {
  useEffect(() => {
    if (!hasUnread) return;
    void markNotificationsSeen().then((result) => {
      if (result.ok) window.dispatchEvent(new Event(NOTIFICATIONS_SEEN_EVENT));
    });
  }, [hasUnread]);
  return null;
}
