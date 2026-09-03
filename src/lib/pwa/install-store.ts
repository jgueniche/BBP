// Install prompt state (brief §10.14): captures `beforeinstallprompt` once,
// remembers a dismissal for a while and exposes a stable snapshot for React.

export type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallSnapshot = {
  /** The browser offered a native prompt we can trigger. */
  promptable: boolean;
  /** Already running as an installed app. */
  installed: boolean;
  /** iOS Safari never fires beforeinstallprompt: show manual steps instead. */
  ios: boolean;
  dismissedUntil: number | null;
};

export const DISMISS_KEY = "bbp.install-dismissed-until";
export const DISMISS_DAYS = 30;

const CHANGE_EVENT = "bbp:install-prompt";

const SERVER_SNAPSHOT: InstallSnapshot = {
  promptable: false,
  installed: false,
  ios: false,
  dismissedUntil: null,
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let snapshot: InstallSnapshot = SERVER_SNAPSHOT;
let listening = false;

function readDismissedUntil(): number | null {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    nav.standalone === true
  );
}

export function isIos(userAgent: string): boolean {
  return /iphone|ipad|ipod/i.test(userAgent);
}

function refresh(): void {
  snapshot = {
    promptable: deferredPrompt !== null,
    installed: isStandalone(),
    ios: isIos(window.navigator.userAgent) && !isStandalone(),
    dismissedUntil: readDismissedUntil(),
  };
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Idempotent: attaches the window listeners once per page. */
export function initInstallListeners(): void {
  if (typeof window === "undefined" || listening) return;
  listening = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    refresh();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    refresh();
  });
  refresh();
}

export function subscribeInstall(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

export function getInstallSnapshot(): InstallSnapshot {
  return snapshot;
}

export function getServerInstallSnapshot(): InstallSnapshot {
  return SERVER_SNAPSHOT;
}

export async function promptInstall(): Promise<
  "accepted" | "dismissed" | "unavailable"
> {
  const event = deferredPrompt;
  if (!event) return "unavailable";
  await event.prompt();
  const { outcome } = await event.userChoice;
  deferredPrompt = null;
  refresh();
  return outcome;
}

export function dismissInstall(days: number = DISMISS_DAYS): void {
  try {
    window.localStorage.setItem(
      DISMISS_KEY,
      String(Date.now() + days * 24 * 60 * 60 * 1000),
    );
  } catch {
    // Private mode: the banner simply shows again next visit.
  }
  refresh();
}

/** Pure rule shared by the banner and the tests. */
export function shouldOfferInstall(
  state: Pick<InstallSnapshot, "promptable" | "installed" | "dismissedUntil">,
  now: number = Date.now(),
): boolean {
  if (state.installed || !state.promptable) return false;
  return state.dismissedUntil === null || state.dismissedUntil <= now;
}
