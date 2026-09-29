import { describe, expect, it } from "vitest";

import { creditLine } from "@/lib/recipes/versions";

import { fitWithin, isOwnPhotoPath } from "./photos";
import {
  canonicalSlugs,
  normalizeTag,
  parseTagInput,
  slugsCoveredBy,
  type TagNode,
} from "./tags";
import { sortTips } from "./tips";

describe("tags", () => {
  it("normalises free input into slugs and labels", () => {
    expect(normalizeTag("#Batch Cooking")).toEqual({
      slug: "batch-cooking",
      label: "Batch Cooking",
    });
    expect(normalizeTag("  Œufs  brouillés ")).toEqual({
      slug: "oeufs-brouilles",
      label: "Œufs brouillés",
    });
    expect(normalizeTag("#")).toBeNull();
    expect(normalizeTag("x".repeat(41))).toBeNull();
  });

  it("parses a comma list without duplicates", () => {
    expect(
      parseTagInput("sans four, Sans-Four, #été ; express").map((t) => t.slug),
    ).toEqual(["sans-four", "ete", "express"]);
  });

  const registry: TagNode[] = [
    { id: "1", slug: "sans-four", canonicalId: null, parentId: "9" },
    { id: "2", slug: "no-oven", canonicalId: "1", parentId: null },
    { id: "3", slug: "express", canonicalId: null, parentId: "9" },
    { id: "9", slug: "cuisine-rapide", canonicalId: null, parentId: null },
    { id: "5", slug: "ete", canonicalId: null, parentId: null },
  ];

  it("replaces synonyms by their reference tag", () => {
    expect(
      canonicalSlugs(["no-oven", "sans-four", "nouveau"], registry),
    ).toEqual(["sans-four", "nouveau"]);
  });

  it("covers synonyms and child tags on a category page", () => {
    expect(slugsCoveredBy("9", registry).sort()).toEqual([
      "cuisine-rapide",
      "express",
      "no-oven",
      "sans-four",
    ]);
    expect(slugsCoveredBy("5", registry)).toEqual(["ete"]);
  });
});

describe("photos", () => {
  it("fits photos in 1600 px without upscaling", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("only accepts photos from the person's own folder", () => {
    const me = "11111111-1111-1111-1111-111111111111";
    const other = "22222222-2222-2222-2222-222222222222";
    const file = "33333333-3333-3333-3333-333333333333.jpg";
    expect(isOwnPhotoPath(`${me}/${file}`, me)).toBe(true);
    expect(isOwnPhotoPath(`${other}/${file}`, me)).toBe(false);
    expect(isOwnPhotoPath(`${me}/../x.jpg`, me)).toBe(false);
  });
});

describe("versions and tips", () => {
  it("credits the chain up to the original creator", () => {
    expect(
      creditLine([
        {
          title: "Tarte fine",
          slug: "a",
          authorName: "Léa",
          sourceAuthor: null,
        },
        {
          title: "Tarte",
          slug: "b",
          authorName: null,
          sourceAuthor: "@maya.cuisine",
        },
      ]),
    ).toBe(
      "d'après « Tarte fine » de Léa, d'après « Tarte », d'après @maya.cuisine",
    );
    expect(creditLine([])).toBeNull();
  });

  it("sorts tips by helpful votes, then oldest first", () => {
    const tips = [
      { id: "a", created_at: "2026-09-01", helpful: 1 },
      { id: "b", created_at: "2026-09-02", helpful: 5 },
      { id: "c", created_at: "2026-08-01", helpful: 1 },
    ];
    expect(sortTips(tips).map((t) => t.id)).toEqual(["b", "c", "a"]);
  });
});
