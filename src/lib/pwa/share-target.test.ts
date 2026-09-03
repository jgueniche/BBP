import { describe, expect, it } from "vitest";

import { DISMISS_DAYS, shouldOfferInstall } from "./install-store";
import { extractUrl, parseSharedImport } from "./share-target";

describe("share target parsing", () => {
  it("prefers an explicit url", () => {
    expect(
      parseSharedImport({ url: "https://www.tiktok.com/@chef/video/1" }),
    ).toEqual({ mode: "url", url: "https://www.tiktok.com/@chef/video/1" });
  });

  it("digs the link out of the text field (Instagram, TikTok)", () => {
    expect(
      parseSharedImport({
        title: "Regarde ça",
        text: "Trop bon ! https://www.instagram.com/reel/abc123/ #couscous",
      }),
    ).toEqual({ mode: "url", url: "https://www.instagram.com/reel/abc123/" });
  });

  it("falls back to text import for a pasted recipe", () => {
    const text =
      "Salade méchouia : 3 poivrons, 2 tomates, ail, huile d'olive, cumin.";
    expect(parseSharedImport({ title: "Méchouia", text })).toEqual({
      mode: "text",
      text: `Méchouia\n\n${text}`,
    });
  });

  it("ignores short or unusable shares", () => {
    expect(parseSharedImport({})).toBeNull();
    expect(parseSharedImport({ text: "coucou" })).toBeNull();
    expect(parseSharedImport({ url: "javascript:alert(1)" })).toBeNull();
    expect(extractUrl("ftp://files.example/x")).toBeNull();
  });

  it("strips trailing punctuation from a link inside a sentence", () => {
    expect(extractUrl("Voir https://example.com/recette).")).toBe(
      "https://example.com/recette",
    );
  });
});

describe("install banner rule", () => {
  const now = Date.UTC(2026, 8, 3);

  it("offers the install only when promptable, not installed, not dismissed", () => {
    expect(
      shouldOfferInstall(
        { promptable: true, installed: false, dismissedUntil: null },
        now,
      ),
    ).toBe(true);
    expect(
      shouldOfferInstall(
        { promptable: true, installed: true, dismissedUntil: null },
        now,
      ),
    ).toBe(false);
    expect(
      shouldOfferInstall(
        { promptable: false, installed: false, dismissedUntil: null },
        now,
      ),
    ).toBe(false);
  });

  it("stays quiet during the dismissal window", () => {
    const later = now + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    expect(
      shouldOfferInstall(
        { promptable: true, installed: false, dismissedUntil: later },
        now,
      ),
    ).toBe(false);
    expect(
      shouldOfferInstall(
        { promptable: true, installed: false, dismissedUntil: later },
        later,
      ),
    ).toBe(true);
  });
});
