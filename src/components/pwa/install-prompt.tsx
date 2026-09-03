"use client";

import { Download, Smartphone } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { KemiaAvatar } from "@/components/illustrations/kemia-avatar";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import {
  dismissInstall,
  getInstallSnapshot,
  getServerInstallSnapshot,
  initInstallListeners,
  promptInstall,
  shouldOfferInstall,
  subscribeInstall,
} from "@/lib/pwa/install-store";

const t = fr.pwa.install;

function useInstallState() {
  useEffect(() => {
    initInstallListeners();
  }, []);
  return useSyncExternalStore(
    subscribeInstall,
    getInstallSnapshot,
    getServerInstallSnapshot,
  );
}

async function install(): Promise<void> {
  const outcome = await promptInstall();
  if (outcome === "accepted") {
    toast(t.installed);
  } else if (outcome === "dismissed") {
    dismissInstall();
  }
}

/** Floating card above the bottom bar once the browser allows installing. */
export function InstallBanner() {
  const state = useInstallState();
  if (!shouldOfferInstall(state)) return null;

  return (
    <div
      role="region"
      aria-label={t.title}
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md rounded-lg border bg-card p-3 shadow-pop lg:inset-x-auto lg:right-6 lg:bottom-6"
    >
      <div className="flex items-start gap-3">
        <KemiaAvatar expression="clin" size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold">{t.title}</p>
          <p className="text-xs text-ink-70">{t.body}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => dismissInstall()}>
          {t.later}
        </Button>
        <Button size="sm" onClick={() => void install()}>
          <Download />
          {t.cta}
        </Button>
      </div>
    </div>
  );
}

/** Profile card: install button, iOS steps, or the installed state. */
export function InstallCard() {
  const state = useInstallState();

  return (
    <div className="rounded-lg border bg-card p-4 shadow-soft">
      <p className="flex items-center gap-2 font-display text-lg font-extrabold">
        <Smartphone size={18} strokeWidth={2} aria-hidden />
        {t.title}
      </p>
      <p className="mt-1 text-xs text-ink-50">{t.body}</p>
      <div className="mt-3">
        {state.installed ? (
          <p className="text-sm font-semibold text-ok">{t.installed}</p>
        ) : state.promptable ? (
          <Button size="sm" variant="secondary" onClick={() => void install()}>
            <Download />
            {t.cta}
          </Button>
        ) : (
          <p className="text-sm text-ink-70">
            {state.ios ? t.iosHint : t.unavailable}
          </p>
        )}
      </div>
    </div>
  );
}
