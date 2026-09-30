import { describe, expect, it } from "vitest";

import { groupNotificationEvents, type NotificationEvent } from "./events";
import { decidePush, isQuietTime, readPushPrefs } from "./push-rules";
import { notificationText, whoLabel } from "./text";

const at = (iso: string) => `2026-09-${iso}Z`;

const events: NotificationEvent[] = [
  {
    kind: "reaction",
    actorId: "ines",
    postId: "p1",
    recipeId: null,
    createdAt: at("28T10:00:00"),
  },
  {
    kind: "reaction",
    actorId: "zoe",
    postId: "p1",
    recipeId: null,
    createdAt: at("29T09:00:00"),
  },
  {
    kind: "reaction",
    actorId: "ines",
    postId: "p1",
    recipeId: null,
    createdAt: at("27T08:00:00"),
  },
  {
    kind: "comment",
    actorId: "ines",
    postId: "p1",
    recipeId: null,
    createdAt: at("28T11:00:00"),
  },
  {
    kind: "follow",
    actorId: "ines",
    postId: null,
    recipeId: null,
    createdAt: at("20T10:00:00"),
  },
  {
    kind: "follow",
    actorId: "zoe",
    postId: null,
    recipeId: null,
    createdAt: at("25T10:00:00"),
  },
  {
    kind: "cooked",
    actorId: "ines",
    postId: "p7",
    recipeId: "tarte",
    createdAt: at("26T10:00:00"),
  },
  {
    kind: "cooked",
    actorId: "zoe",
    postId: "p8",
    recipeId: "tarte",
    createdAt: at("26T12:00:00"),
  },
  {
    kind: "tip",
    actorId: "zoe",
    postId: null,
    recipeId: "tarte",
    createdAt: at("24T12:00:00"),
  },
];

describe("notification groups", () => {
  const groups = groupNotificationEvents(events, at("26T00:00:00"));

  it("groups followers together, reactions per post, cooks per recipe", () => {
    expect(groups.map((g) => [g.key, g.actorIds])).toEqual([
      ["reaction:p1", ["zoe", "ines"]],
      ["comment:p1", ["ines"]],
      ["cooked:tarte", ["zoe", "ines"]],
      ["follow:", ["zoe", "ines"]],
      ["tip:tarte", ["zoe"]],
    ]);
  });

  it("marks a group unread when its latest event is after the last visit", () => {
    expect(groups.map((g) => g.unread)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    expect(groupNotificationEvents(events, null).every((g) => g.unread)).toBe(
      true,
    );
  });
});

describe("notification texts", () => {
  const names: Record<string, string | null> = {
    lea: "Léa",
    ines: "Inès",
    zoe: null,
    sam: "Sam",
  };
  const nameOf = (id: string) => names[id] ?? null;

  it("names public profiles only", () => {
    expect(whoLabel(["ines"], nameOf)).toBe("Inès");
    expect(whoLabel(["zoe"], nameOf)).toBe("Quelqu'un");
    expect(whoLabel(["ines", "lea"], nameOf)).toBe("Inès et Léa");
    expect(whoLabel(["zoe", "ines"], nameOf)).toBe(
      "Inès et une autre personne",
    );
    expect(whoLabel(["zoe", "x"], nameOf)).toBe("2 personnes");
    expect(whoLabel(["zoe", "ines", "lea", "sam"], nameOf)).toBe(
      "Inès et 3 autres",
    );
  });

  it("writes one sober sentence per group", () => {
    expect(
      notificationText({ kind: "follow", actorIds: ["ines"] }, { nameOf }),
    ).toBe("Inès te suit.");
    expect(
      notificationText(
        { kind: "reaction", actorIds: ["ines", "lea"] },
        { nameOf },
      ),
    ).toBe("Inès et Léa ont réagi à ta publication.");
    expect(
      notificationText(
        { kind: "cooked", actorIds: ["ines"] },
        { nameOf, recipeTitle: "Tarte fine" },
      ),
    ).toBe("Inès a cuisiné ta recette « Tarte fine ».");
    expect(
      notificationText({ kind: "cooked", actorIds: ["zoe"] }, { nameOf }),
    ).toBe("Quelqu'un a cuisiné une de tes recettes.");
    expect(
      notificationText(
        { kind: "tip", actorIds: ["ines", "zoe", "lea"] },
        { nameOf, recipeTitle: "Dhal" },
      ),
    ).toBe("Inès et 2 autres ont laissé une astuce sur « Dhal ».");
  });
});

describe("push rules", () => {
  const prefs = readPushPrefs({});
  // 14:00 in Paris (UTC+2 in September).
  const afternoon = new Date("2026-09-29T12:00:00Z");

  it("reads preferences, every kind on by default", () => {
    expect(prefs).toEqual({
      cooked: true,
      tip: true,
      follow: true,
      comment: true,
    });
    expect(readPushPrefs({ push: { follow: false } }).follow).toBe(false);
    expect(readPushPrefs("nonsense").cooked).toBe(true);
  });

  it("never rings for reactions nor for a kind turned off", () => {
    expect(
      decidePush({
        kind: "reaction",
        prefs,
        sentOn: null,
        sentCount: 0,
        now: afternoon,
      }),
    ).toEqual({ send: false, reason: "kind" });
    expect(
      decidePush({
        kind: "follow",
        prefs: { ...prefs, follow: false },
        sentOn: null,
        sentCount: 0,
        now: afternoon,
      }),
    ).toEqual({ send: false, reason: "prefs" });
  });

  it("stays silent from 21:30 to 8:30 local time", () => {
    expect(isQuietTime(21 * 60 + 29)).toBe(false);
    expect(isQuietTime(21 * 60 + 30)).toBe(true);
    expect(isQuietTime(8 * 60 + 29)).toBe(true);
    expect(isQuietTime(8 * 60 + 30)).toBe(false);
    // 22:15 in Paris, 13:15 in Montréal.
    const evening = new Date("2026-09-29T20:15:00Z");
    expect(
      decidePush({
        kind: "cooked",
        prefs,
        sentOn: null,
        sentCount: 0,
        now: evening,
      }),
    ).toEqual({ send: false, reason: "quiet" });
    expect(
      decidePush({
        kind: "cooked",
        prefs,
        sentOn: null,
        sentCount: 0,
        now: evening,
        timeZone: "America/Toronto",
      }),
    ).toEqual({ send: true, day: "2026-09-29", count: 1 });
  });

  it("sends two a day at most, the counter restarts the next day", () => {
    expect(
      decidePush({
        kind: "tip",
        prefs,
        sentOn: "2026-09-29",
        sentCount: 1,
        now: afternoon,
      }),
    ).toEqual({ send: true, day: "2026-09-29", count: 2 });
    expect(
      decidePush({
        kind: "tip",
        prefs,
        sentOn: "2026-09-29",
        sentCount: 2,
        now: afternoon,
      }),
    ).toEqual({ send: false, reason: "cap" });
    expect(
      decidePush({
        kind: "tip",
        prefs,
        sentOn: "2026-09-28",
        sentCount: 2,
        now: afternoon,
      }),
    ).toEqual({ send: true, day: "2026-09-29", count: 1 });
  });

  it("uses the local day around midnight and across the time change", () => {
    // 23:30 UTC on 25/10 = 00:30 on 26/10 in Paris (winter time): quiet.
    expect(
      decidePush({
        kind: "cooked",
        prefs,
        sentOn: "2026-10-25",
        sentCount: 2,
        now: new Date("2026-10-25T23:30:00Z"),
      }),
    ).toEqual({ send: false, reason: "quiet" });
    // 08:45 in Paris on 26/10 (UTC+1): a new day, the cap is reset.
    expect(
      decidePush({
        kind: "cooked",
        prefs,
        sentOn: "2026-10-25",
        sentCount: 2,
        now: new Date("2026-10-26T07:45:00Z"),
      }),
    ).toEqual({ send: true, day: "2026-10-26", count: 1 });
  });
});
