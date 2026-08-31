"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Keeps the journal on the real current day. The server renders "today" per
 * request, but an app left open on a phone never re-renders — the next
 * morning it still shows yesterday. This watches focus/visibility plus a
 * minute tick and refreshes the RSC payload when the rendered day is stale.
 * A day pinned via ?d= is a deliberate choice and is left alone.
 */
export function DayGuard({
  serverDate,
  pinned,
  timeZone,
}: {
  serverDate: string;
  pinned: boolean;
  timeZone: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (pinned) return;
    const todayKey = () =>
      new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
    const check = () => {
      if (todayKey() !== serverDate) router.refresh();
    };
    check();
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    const tick = setInterval(check, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      clearInterval(tick);
    };
  }, [serverDate, pinned, timeZone, router]);

  return null;
}
