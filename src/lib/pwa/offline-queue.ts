import { z } from "zod";

import { queuedMealSchema, type QueuedMeal } from "@/lib/nutrition/log-input";

export const OFFLINE_QUEUE_KEY = "bbp.offline-meals.v1";

/** Entries that keep failing for a non-network reason are dropped. */
export const MAX_ATTEMPTS = 5;

const entrySchema = z.object({
  id: z.string().min(1),
  queuedAt: z.string(),
  attempts: z.number().int().min(0).default(0),
  meal: queuedMealSchema,
});

export type QueueEntry = z.infer<typeof entrySchema>;

export type KeyValueStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export type FlushResult = { sent: number; failed: number; remaining: number };

export function readQueue(storage: KeyValueStorage): QueueEntry[] {
  try {
    const raw = storage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = z.array(entrySchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function writeQueue(
  storage: KeyValueStorage,
  entries: QueueEntry[],
): void {
  if (entries.length === 0) {
    storage.removeItem(OFFLINE_QUEUE_KEY);
    return;
  }
  storage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(entries));
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function enqueueMeal(
  storage: KeyValueStorage,
  meal: QueuedMeal,
  now: Date = new Date(),
): QueueEntry {
  const entry: QueueEntry = {
    id: randomId(),
    queuedAt: now.toISOString(),
    attempts: 0,
    meal: queuedMealSchema.parse(meal),
  };
  writeQueue(storage, [...readQueue(storage), entry]);
  return entry;
}

export function dequeueMeal(storage: KeyValueStorage, id: string): void {
  writeQueue(
    storage,
    readQueue(storage).filter((entry) => entry.id !== id),
  );
}

/**
 * True for the errors a failed fetch raises when the device is offline
 * ("Failed to fetch", "Load failed"). Server-side failures are plain Errors.
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }
  return error instanceof TypeError;
}

/**
 * Replays queued meals in order. A network failure stops the run (the
 * device is still offline); any other failure counts one attempt and the
 * entry is dropped after MAX_ATTEMPTS so a poison entry never blocks the rest.
 */
export async function flushQueue(
  storage: KeyValueStorage,
  send: (meal: QueuedMeal) => Promise<void>,
): Promise<FlushResult> {
  let sent = 0;
  let failed = 0;
  for (const entry of readQueue(storage)) {
    try {
      await send(entry.meal);
      dequeueMeal(storage, entry.id);
      sent += 1;
    } catch (error) {
      failed += 1;
      if (isNetworkError(error)) break;
      const attempts = entry.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        dequeueMeal(storage, entry.id);
      } else {
        writeQueue(
          storage,
          readQueue(storage).map((e) =>
            e.id === entry.id ? { ...e, attempts } : e,
          ),
        );
      }
    }
  }
  return { sent, failed, remaining: readQueue(storage).length };
}
