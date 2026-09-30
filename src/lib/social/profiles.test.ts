import { describe, expect, it } from "vitest";

import { initialOf, isOwnAvatarPath, squareCrop } from "./avatars";
import { checkHandle, normalizeHandle, profileHref } from "./handles";
import { parseProfileInput } from "./profile";
import { rankSuggestions } from "./suggestions";

const LEA = "11111111-1111-1111-1111-111111111111";

describe("handles", () => {
  it("previews a handle from free input", () => {
    expect(normalizeHandle("@Léa Cuisine")).toBe("lea.cuisine");
    expect(normalizeHandle("  Chloé--Bœuf  ")).toBe("chloe.boeuf");
    expect(normalizeHandle("..zoé__.")).toBe("zoe__");
    expect(normalizeHandle("a!b#c")).toBe("abc");
  });

  it("accepts 3 to 30 letters, digits, dots and underscores", () => {
    expect(checkHandle("lea")).toEqual({ ok: true, handle: "lea" });
    expect(checkHandle("@Lea_Cuisine.75")).toEqual({
      ok: true,
      handle: "lea_cuisine.75",
    });
    expect(checkHandle("le")).toEqual({ ok: false, reason: "length" });
    expect(checkHandle("x".repeat(31)).ok).toBe(true);
    expect(normalizeHandle("x".repeat(31))).toHaveLength(30);
  });

  it("keeps the app's own names out of reach", () => {
    expect(checkHandle("admin")).toEqual({ ok: false, reason: "reserved" });
    expect(checkHandle("Modération")).toEqual({
      ok: false,
      reason: "reserved",
    });
    expect(checkHandle("copine.officielle")).toEqual({
      ok: false,
      reason: "reserved",
    });
  });

  it("links to the handle, else to the account id", () => {
    expect(profileHref({ id: LEA, handle: "lea" })).toBe(
      "/communaute/membre/lea",
    );
    expect(profileHref({ id: LEA, handle: null })).toBe(
      `/communaute/membre/${LEA}`,
    );
  });
});

describe("profile form", () => {
  it("trims and makes handle and bio optional", () => {
    expect(
      parseProfileInput({ displayName: "  Léa  ", handle: "", bio: "  " }),
    ).toEqual({
      ok: true,
      value: { displayName: "Léa", handle: null, bio: null },
    });
    expect(
      parseProfileInput({
        displayName: "Léa",
        handle: "@Lea.Cuisine",
        bio: "Cuisine du dimanche",
      }),
    ).toEqual({
      ok: true,
      value: {
        displayName: "Léa",
        handle: "lea.cuisine",
        bio: "Cuisine du dimanche",
      },
    });
  });

  it("names the field that fails", () => {
    expect(
      parseProfileInput({ displayName: " ", handle: "", bio: "" }),
    ).toEqual({ ok: false, field: "displayName", reason: "required" });
    expect(
      parseProfileInput({
        displayName: "Léa",
        handle: "",
        bio: "x".repeat(161),
      }),
    ).toEqual({ ok: false, field: "bio", reason: "length" });
    expect(
      parseProfileInput({ displayName: "Léa", handle: "support", bio: "" }),
    ).toEqual({ ok: false, field: "handle", reason: "reserved" });
  });
});

describe("profile photos", () => {
  it("only accepts a photo from one's own folder", () => {
    const own = `${LEA}/7c0b8f5e-1d7a-4d3e-9a55-0d6c0f7b2a11.jpg`;
    expect(isOwnAvatarPath(own, LEA)).toBe(true);
    expect(isOwnAvatarPath(own, "22222222-2222-2222-2222-222222222222")).toBe(
      false,
    );
    expect(isOwnAvatarPath("https://example.org/me.jpg", LEA)).toBe(false);
    expect(isOwnAvatarPath(`${LEA}/../x.jpg`, LEA)).toBe(false);
  });

  it("crops the centred square", () => {
    expect(squareCrop(1600, 1200)).toEqual({ sx: 200, sy: 0, side: 1200 });
    expect(squareCrop(900, 1600)).toEqual({ sx: 0, sy: 350, side: 900 });
  });

  it("draws the monogram from the first letter", () => {
    expect(initialOf("élodie")).toBe("É");
    expect(initialOf("  @zoé")).toBe("Z");
    expect(initialOf(null)).toBe("·");
  });
});

describe("suggestions", () => {
  const candidates = [
    { id: "a", recipeIds: ["r1"], lastAt: "2026-09-20T10:00:00Z" },
    { id: "b", recipeIds: ["r2", "r3", "r2"], lastAt: "2026-09-10T10:00:00Z" },
    { id: "c", recipeIds: ["r9"], lastAt: "2026-09-28T10:00:00Z" },
    { id: "me", recipeIds: ["r2"], lastAt: "2026-09-29T10:00:00Z" },
  ];

  it("puts shared recipes first, then recency, never me nor my follows", () => {
    const ranked = rankSuggestions(candidates, {
      myRecipeIds: new Set(["r2", "r3"]),
      exclude: new Set(["me", "a"]),
    });
    expect(ranked.map((c) => [c.id, c.shared])).toEqual([
      ["b", 2],
      ["c", 0],
    ]);
  });

  it("caps the list", () => {
    expect(
      rankSuggestions(candidates, {
        myRecipeIds: new Set(),
        exclude: new Set(),
        limit: 2,
      }).map((c) => c.id),
    ).toEqual(["me", "c"]);
  });
});
