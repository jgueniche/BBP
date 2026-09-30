export const NOTIFICATION_KINDS = [
  "follow",
  "reaction",
  "comment",
  "cooked",
  "tip",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** One row of the notification_events function (what happened, for me). */
export type NotificationEvent = {
  kind: NotificationKind;
  actorId: string;
  postId: string | null;
  recipeId: string | null;
  createdAt: string;
};

export type NotificationGroup = {
  key: string;
  kind: NotificationKind;
  /** Distinct actors, most recent first. */
  actorIds: string[];
  postId: string | null;
  recipeId: string | null;
  latestAt: string;
  unread: boolean;
};

export function isNotificationKind(value: string): value is NotificationKind {
  return (NOTIFICATION_KINDS as readonly string[]).includes(value);
}

/**
 * New followers make one notification; reactions and comments group per post,
 * « j'ai cuisiné » and tips per recipe (same keys as unread_notification_count).
 */
export function groupKey(event: NotificationEvent): string {
  switch (event.kind) {
    case "follow":
      return "follow:";
    case "cooked":
    case "tip":
      return `${event.kind}:${event.recipeId ?? ""}`;
    default:
      return `${event.kind}:${event.postId ?? ""}`;
  }
}

export function groupNotificationEvents(
  events: NotificationEvent[],
  seenAt: string | null,
): NotificationGroup[] {
  const seen = seenAt ? Date.parse(seenAt) : Number.NEGATIVE_INFINITY;
  const sorted = [...events].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  const groups = new Map<string, NotificationGroup>();
  for (const event of sorted) {
    const key = groupKey(event);
    const group = groups.get(key);
    if (!group) {
      groups.set(key, {
        key,
        kind: event.kind,
        actorIds: [event.actorId],
        postId: event.postId,
        recipeId: event.recipeId,
        latestAt: event.createdAt,
        unread: Date.parse(event.createdAt) > seen,
      });
    } else if (!group.actorIds.includes(event.actorId)) {
      group.actorIds.push(event.actorId);
    }
  }
  return [...groups.values()];
}
