import { z } from "zod";

import { localClock } from "@/lib/utils/local-date";

import type { NotificationKind } from "./events";

/** Reactions never ring: they stay in the in-app inbox. */
export const PUSH_KINDS = ["cooked", "tip", "follow", "comment"] as const;
export type PushKind = (typeof PUSH_KINDS)[number];

export const DAILY_PUSH_CAP = 2;
/** No push from 21:30 to 8:30, in the person's time zone. */
export const QUIET_FROM_MINUTES = 21 * 60 + 30;
export const QUIET_UNTIL_MINUTES = 8 * 60 + 30;

export type PushPrefs = Record<PushKind, boolean>;

const prefsSchema = z.object({
  push: z
    .object({
      cooked: z.boolean(),
      tip: z.boolean(),
      follow: z.boolean(),
      comment: z.boolean(),
    })
    .partial()
    .optional(),
});

/** user_settings.notif_prefs → push preferences, every kind on by default. */
export function readPushPrefs(raw: unknown): PushPrefs {
  const parsed = prefsSchema.safeParse(raw ?? {});
  const push = parsed.success ? (parsed.data.push ?? {}) : {};
  return {
    cooked: push.cooked ?? true,
    tip: push.tip ?? true,
    follow: push.follow ?? true,
    comment: push.comment ?? true,
  };
}

export function isPushKind(kind: NotificationKind): kind is PushKind {
  return (PUSH_KINDS as readonly string[]).includes(kind);
}

export function isQuietTime(minutes: number): boolean {
  return minutes >= QUIET_FROM_MINUTES || minutes < QUIET_UNTIL_MINUTES;
}

export type PushDecision =
  | { send: true; day: string; count: number }
  | { send: false; reason: "kind" | "prefs" | "quiet" | "cap" };

/** Rare and useful: opted-in kinds only, daytime only, two a day at most. */
export function decidePush(input: {
  kind: NotificationKind;
  prefs: PushPrefs;
  sentOn: string | null;
  sentCount: number;
  now: Date;
  timeZone?: string | null;
}): PushDecision {
  if (!isPushKind(input.kind)) return { send: false, reason: "kind" };
  if (!input.prefs[input.kind]) return { send: false, reason: "prefs" };
  const clock = localClock(input.now, input.timeZone);
  if (isQuietTime(clock.minutes)) return { send: false, reason: "quiet" };
  const sentToday = input.sentOn === clock.day ? input.sentCount : 0;
  if (sentToday >= DAILY_PUSH_CAP) return { send: false, reason: "cap" };
  return { send: true, day: clock.day, count: sentToday + 1 };
}
