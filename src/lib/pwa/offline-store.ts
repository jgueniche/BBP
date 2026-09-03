import type { QueuedMeal } from "@/lib/nutrition/log-input";

import {
  OFFLINE_QUEUE_KEY,
  dequeueMeal,
  enqueueMeal,
  flushQueue,
  readQueue,
  type FlushResult,
  type QueueEntry,
} from "./offline-queue";

// Browser-side view of the offline queue (localStorage) for React components:
// a stable snapshot for useSyncExternalStore plus a change event so the
// journal list, the status banner and the composer stay in sync.
const CHANGE_EVENT = "bbp:offline-queue";

export const EMPTY_QUEUE: QueueEntry[] = [];

let lastRaw: string | null | undefined;
let lastSnapshot: QueueEntry[] = EMPTY_QUEUE;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function notify(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function getQueueSnapshot(): QueueEntry[] {
  const store = storage();
  if (!store) return EMPTY_QUEUE;
  const raw = store.getItem(OFFLINE_QUEUE_KEY);
  if (raw === lastRaw) return lastSnapshot;
  lastRaw = raw;
  lastSnapshot = raw ? readQueue(store) : EMPTY_QUEUE;
  return lastSnapshot;
}

export function getServerQueueSnapshot(): QueueEntry[] {
  return EMPTY_QUEUE;
}

export function subscribeQueue(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === OFFLINE_QUEUE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function queueMeal(meal: QueuedMeal): QueueEntry | null {
  const store = storage();
  if (!store) return null;
  const entry = enqueueMeal(store, meal);
  notify();
  return entry;
}

export function removeQueuedMeal(id: string): void {
  const store = storage();
  if (!store) return;
  dequeueMeal(store, id);
  notify();
}

let inFlight: Promise<FlushResult> | null = null;

/** Replays the queue; concurrent callers share the same run. */
export function syncQueue(
  send: (meal: QueuedMeal) => Promise<void>,
): Promise<FlushResult> {
  const store = storage();
  if (!store) return Promise.resolve({ sent: 0, failed: 0, remaining: 0 });
  if (inFlight) return inFlight;
  inFlight = flushQueue(store, send).finally(() => {
    inFlight = null;
    notify();
  });
  return inFlight;
}
