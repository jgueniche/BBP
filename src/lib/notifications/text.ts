import { fr } from "@/i18n/fr";

import type { NotificationGroup } from "./events";

const t = fr.notifications;

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

/**
 * « Léa », « Léa et Inès », « Léa et 3 autres », « 2 personnes »: names only
 * for public profiles, the others stay « Quelqu'un ».
 */
export function whoLabel(
  actorIds: string[],
  nameOf: (id: string) => string | null,
): string {
  const count = actorIds.length;
  const names = actorIds.map(nameOf);
  const named = names.filter((name): name is string => Boolean(name));
  if (count <= 1) return names[0] ?? t.who.someone;
  if (count === 2) {
    if (named.length === 2)
      return fill(t.who.pair, { a: named[0], b: named[1] });
    if (named.length === 1) return fill(t.who.pairAnonymous, { a: named[0] });
    return fill(t.who.people, { n: "2" });
  }
  if (named.length > 0) {
    return fill(t.who.others, { a: named[0], n: String(count - 1) });
  }
  return fill(t.who.people, { n: String(count) });
}

export function notificationText(
  group: Pick<NotificationGroup, "kind" | "actorIds">,
  context: {
    nameOf: (id: string) => string | null;
    recipeTitle?: string | null;
  },
): string {
  const who = whoLabel(group.actorIds, context.nameOf);
  const template =
    t.kinds[group.kind][group.actorIds.length > 1 ? "many" : "one"];
  const title = context.recipeTitle ?? null;
  const recipe =
    group.kind === "cooked"
      ? title
        ? fill(t.recipe.yours, { title })
        : t.recipe.yoursUnknown
      : title
        ? fill(t.recipe.on, { title })
        : t.recipe.onUnknown;
  return fill(template, { who, recipe });
}
