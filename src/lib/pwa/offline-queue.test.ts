import { describe, expect, it, vi } from "vitest";

import type { QueuedMeal } from "@/lib/nutrition/log-input";

import {
  MAX_ATTEMPTS,
  OFFLINE_QUEUE_KEY,
  enqueueMeal,
  flushQueue,
  isNetworkError,
  readQueue,
  type KeyValueStorage,
} from "./offline-queue";

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const couscous: QueuedMeal = {
  kind: "text",
  date: "2026-09-03",
  meal: "diner",
  items: [
    { name: "couscous", grams: 200 },
    { name: "boulettes", grams: 120 },
  ],
  rawInput: "couscous et boulettes",
  source: "text",
};

const favorite: QueuedMeal = {
  kind: "favorite",
  date: "2026-09-03",
  meal: "petit_dej",
  label: "Café + brik",
};

describe("offline meal queue", () => {
  it("stores meals in order and survives a corrupted payload", () => {
    const storage = memoryStorage();
    enqueueMeal(storage, couscous, new Date("2026-09-03T12:00:00Z"));
    enqueueMeal(storage, favorite);

    const queue = readQueue(storage);
    expect(queue).toHaveLength(2);
    expect(queue[0]!.meal).toEqual(couscous);
    expect(queue[0]!.queuedAt).toBe("2026-09-03T12:00:00.000Z");
    expect(queue[1]!.meal.kind).toBe("favorite");

    storage.setItem(OFFLINE_QUEUE_KEY, "{not json");
    expect(readQueue(storage)).toEqual([]);
  });

  it("rejects an invalid meal before it reaches the queue", () => {
    const storage = memoryStorage();
    expect(() =>
      enqueueMeal(storage, {
        ...couscous,
        items: [{ name: "", grams: 0 }],
      }),
    ).toThrow();
    expect(readQueue(storage)).toEqual([]);
  });

  // DoD brief §10.14: a meal captured offline is synced when the network is
  // back — the send callback fails while offline, then succeeds.
  it("replays the queue once the network is back", async () => {
    const storage = memoryStorage();
    enqueueMeal(storage, couscous);
    enqueueMeal(storage, favorite);

    const offline = vi
      .fn<(meal: QueuedMeal) => Promise<void>>()
      .mockRejectedValue(new TypeError("Failed to fetch"));
    const first = await flushQueue(storage, offline);
    expect(first).toEqual({ sent: 0, failed: 1, remaining: 2 });
    // A network failure stops the run instead of burning every entry.
    expect(offline).toHaveBeenCalledTimes(1);

    const online = vi
      .fn<(meal: QueuedMeal) => Promise<void>>()
      .mockResolvedValue(undefined);
    const second = await flushQueue(storage, online);
    expect(second).toEqual({ sent: 2, failed: 0, remaining: 0 });
    expect(online.mock.calls.map(([meal]) => meal.kind)).toEqual([
      "text",
      "favorite",
    ]);
    expect(storage.data.has(OFFLINE_QUEUE_KEY)).toBe(false);
  });

  it("drops a poison entry after MAX_ATTEMPTS server failures", async () => {
    const storage = memoryStorage();
    enqueueMeal(storage, couscous);
    enqueueMeal(storage, favorite);

    const send = vi
      .fn<(meal: QueuedMeal) => Promise<void>>()
      .mockImplementation(async (meal) => {
        if (meal.kind === "text") throw new Error("Not authenticated");
      });

    for (let i = 0; i < MAX_ATTEMPTS - 1; i += 1) {
      const result = await flushQueue(storage, send);
      expect(result.remaining).toBe(1);
      expect(readQueue(storage)[0]!.attempts).toBe(i + 1);
    }
    const last = await flushQueue(storage, send);
    expect(last).toEqual({ sent: 0, failed: 1, remaining: 0 });
  });

  it("tells network errors apart from server errors", () => {
    expect(isNetworkError(new TypeError("Load failed"))).toBe(true);
    expect(isNetworkError(new Error("Not authenticated"))).toBe(false);
  });
});
