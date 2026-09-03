import type { Metadata } from "next";
import Link from "next/link";

import { KemiaAvatar } from "@/components/illustrations/kemia-avatar";
import { RetryButton } from "@/components/pwa/retry-button";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

const t = fr.pwa.offline;

export const metadata: Metadata = {
  title: t.title,
  robots: { index: false, follow: false },
};

// Offline shell (brief §10.14): precached by the service worker and served
// for any document request that fails while the network is down.
export default function OfflinePage() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <KemiaAvatar expression="douce" size={96} />
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        {t.title}
      </h1>
      <p className="text-ink-70">{t.body}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <RetryButton />
        <Button asChild variant="secondary">
          <Link href="/journal">{t.backToJournal}</Link>
        </Button>
      </div>
    </main>
  );
}
