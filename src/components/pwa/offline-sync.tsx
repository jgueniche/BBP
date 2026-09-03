"use client";

import { CloudOff, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { syncQueuedMeal } from "@/app/(app)/journal/actions";
import { fr } from "@/i18n/fr";
import {
  getQueueSnapshot,
  getServerQueueSnapshot,
  subscribeQueue,
  syncQueue,
} from "@/lib/pwa/offline-store";

const t = fr.pwa.offline;

/**
 * Offline status + replay of the meal queue (brief §10.14 DoD): meals noted
 * without network are sent back through the journal Server Action as soon
 * as the browser reports the connection, on focus, and on mount.
 */
export function OfflineSync() {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const queue = useSyncExternalStore(
    subscribeQueue,
    getQueueSnapshot,
    getServerQueueSnapshot,
  );

  const flush = useCallback(async () => {
    if (!navigator.onLine || getQueueSnapshot().length === 0) return;
    setSyncing(true);
    try {
      const result = await syncQueue(async (meal) => {
        await syncQueuedMeal(meal);
      });
      if (result.sent > 0) {
        toast(t.synced(result.sent));
        router.refresh();
      } else if (result.failed > 0 && navigator.onLine) {
        toast(t.syncFailed);
      }
    } finally {
      setSyncing(false);
    }
  }, [router]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => {
      setOnline(true);
      void flush();
    };
    const goOffline = () => setOnline(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") void flush();
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    document.addEventListener("visibilitychange", onVisible);
    void flush();
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [flush]);

  if (online && queue.length === 0) return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-warn/40 bg-warn-soft px-3 py-2 text-sm font-medium"
    >
      <CloudOff size={16} strokeWidth={2} aria-hidden />
      <span className="min-w-0 flex-1">
        {online ? t.pending(queue.length) : t.banner}
      </span>
      {online && queue.length > 0 && (
        <button
          type="button"
          onClick={() => void flush()}
          disabled={syncing}
          className="inline-flex items-center gap-1 rounded-full border border-input bg-card px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
        >
          <RefreshCw
            size={12}
            strokeWidth={2}
            aria-hidden
            className={syncing ? "animate-spin" : undefined}
          />
          {t.syncNow}
        </button>
      )}
    </p>
  );
}
