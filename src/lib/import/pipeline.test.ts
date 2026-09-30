import { describe, expect, it, vi } from "vitest";

import type { FetchedPage } from "./net/transport";
import {
  canonicalSource,
  importFromImages,
  importFromText,
  importFromUrl,
  type CreatorCheck,
  type ImportDraft,
  type PipelineDeps,
} from "./pipeline";
import { sourceKeyOf } from "./source-key";
import cases from "./source-key.cases.json";
import {
  canonicalPostUrl,
  detectSource,
  pinterestPinId,
  recipeLinksIn,
  socialPost,
} from "./sources";

const OPEN: CreatorCheck = {
  withdrawn: false,
  blocked: false,
  official: null,
  mine: false,
};

const RECIPE_PAGE = `<html><head><link rel="canonical" href="https://www.marmiton.org/recettes/recette_gratin_1.aspx">
<script type="application/ld+json">${JSON.stringify({
  "@type": "Recipe",
  name: "Gratin dauphinois : la recette",
  description: "La prose du site, jamais recopiée.",
  recipeYield: "6 personnes",
  recipeIngredient: ["1 kg de pommes de terre", "50 cl de crème"],
  recipeInstructions: [
    { "@type": "HowToStep", text: "Tranche les pommes de terre finement." },
  ],
})}</script></head></html>`;

const CAPTION = `Gratin express 🥔
Ingrédients :
- 800 g de pommes de terre
- 40 cl de crème
Préparation :
1. Tranche les pommes de terre et range-les dans le plat.
2. Verse la crème et enfourne 45 minutes.`;

function page(url: string, text: string, status = 200): FetchedPage {
  return { ok: status < 300, status, url, contentType: "text/html", text };
}

function deps(overrides: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    fetchPage: vi.fn(async (url: string) => page(url, RECIPE_PAGE)),
    resolveShortLink: vi.fn(async () => null),
    tiktokPost: vi.fn(async (post) => ({
      url: `https://www.tiktok.com/@maya.cuisine/video/${post.id}`,
      handle: "maya.cuisine",
      caption: CAPTION,
    })),
    youtubeVideo: vi.fn(async () => ({
      title: "Gratin express",
      description: CAPTION,
      handle: "hervecuisine",
    })),
    pinterestOrigin: vi.fn(async () => null),
    extract: null,
    checkCreator: vi.fn(async () => OPEN),
    findMyCopy: vi.fn(async () => null),
    ...overrides,
  };
}

describe("source keys", () => {
  it.each(cases as Array<[string, string | null]>)(
    "« %s » → %s (same as the SQL)",
    (url, key) => {
      expect(sourceKeyOf(url)).toBe(key);
    },
  );
});

describe("sources", () => {
  it("tells Pinterest pins apart and canonicalizes posts", () => {
    expect(detectSource("https://pin.it/1a2b3c4")).toBe("pinterest");
    expect(detectSource("https://fr.pinterest.com/pin/123456789/")).toBe(
      "pinterest",
    );
    expect(detectSource("https://www.marmiton.org/x")).toBe("web");
    expect(
      pinterestPinId(
        "https://www.pinterest.fr/pin/gratin-facile--99360735500167749/",
      ),
    ).toBe("99360735500167749");
    expect(
      pinterestPinId("https://www.pinterest.fr/maya/recettes/"),
    ).toBeNull();
    const reel = socialPost(
      "https://www.instagram.com/reels/C1aBcD2eFgH/?igsh=x",
    );
    expect(reel && canonicalPostUrl(reel)).toBe(
      "https://www.instagram.com/reel/C1aBcD2eFgH/",
    );
    const short = socialPost("https://youtube.com/shorts/aB3dE5fG7hI?si=x");
    expect(short && canonicalPostUrl(short)).toBe(
      "https://www.youtube.com/shorts/aB3dE5fG7hI",
    );
    const watch = socialPost("https://youtu.be/dQw4w9WgXcQ?t=3");
    expect(watch && canonicalPostUrl(watch)).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(socialPost("https://www.instagram.com/maya.cuisine/")).toBeNull();
  });

  it("finds written recipes in a video description", () => {
    expect(
      recipeLinksIn(
        "Ma boutique : https://amzn.to/x · Recette complète : https://hervecuisine.com/recette/gratin/ (merci !) " +
          "https://www.instagram.com/p/abcde/ https://www.marmiton.org/recettes/recette_gratin_1.aspx https://blog.fr/a-propos",
      ),
    ).toEqual([
      "https://hervecuisine.com/recette/gratin/",
      "https://www.marmiton.org/recettes/recette_gratin_1.aspx",
    ]);
  });

  it("keeps a typed source canonical", () => {
    expect(
      canonicalSource(
        "https://www.tiktok.com/@maya/video/7312345678901234567?lang=fr",
      ),
    ).toBe("https://www.tiktok.com/@maya/video/7312345678901234567");
    expect(canonicalSource("https://pin.it/abc")).toBeNull();
    expect(canonicalSource("https://blog.fr/soupe?utm_source=x")).toBe(
      "https://blog.fr/soupe",
    );
  });
});

describe("importFromUrl — sites", () => {
  it("builds a draft from the structure, without the site's prose", async () => {
    const d = deps();
    const outcome = await importFromUrl(
      d,
      "https://www.marmiton.org/recettes/recette_gratin_1.aspx?utm_campaign=x",
    );
    expect(outcome.kind).toBe("draft");
    if (outcome.kind !== "draft") return;
    expect(outcome.draft).toMatchObject({
      title: "Gratin dauphinois",
      servings: 6,
      description: null,
      reformulated: false,
      sourceUrl: "https://www.marmiton.org/recettes/recette_gratin_1.aspx",
    });
    expect(d.checkCreator).toHaveBeenCalledWith(
      "https://www.marmiton.org/recettes/recette_gratin_1.aspx",
      expect.objectContaining({ platform: "web", handle: "marmiton.org" }),
    );
  });

  it("lets the AI reformulate a structured recipe", async () => {
    const extract = vi.fn(async (): Promise<ImportDraft> => ({
      title: "Gratin dauphinois",
      description: "Un gratin fondant, à notre façon.",
      servings: 6,
      prepMin: null,
      cookMin: null,
      tags: [],
      category: "accompagnement",
      cuisine: "france",
      ingredients: [
        { label: "pommes de terre", grams: 1000, section: null },
        { label: "crème", grams: 500, section: null },
      ],
      steps: [
        {
          text: "Coupe les pommes de terre en fines rondelles.",
          durationMin: null,
          section: null,
        },
      ],
      sourceUrl: null,
      sourceAuthor: null,
      method: "ai",
      reformulated: true,
      icon: "🥔",
    }));
    const outcome = await importFromUrl(
      deps({ extract }),
      "https://www.marmiton.org/recettes/recette_gratin_1.aspx",
    );
    expect(extract).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "structured" }),
    );
    expect(outcome).toMatchObject({
      kind: "draft",
      draft: {
        description: "Un gratin fondant, à notre façon.",
        reformulated: true,
        sourceUrl: "https://www.marmiton.org/recettes/recette_gratin_1.aspx",
      },
    });
  });

  it("respects a site that refuses imports before reading it", async () => {
    const d = deps({
      checkCreator: vi.fn(async () => ({ ...OPEN, blocked: true })),
    });
    expect(
      await importFromUrl(
        d,
        "https://www.marmiton.org/recettes/recette_gratin_1.aspx",
      ),
    ).toMatchObject({
      kind: "gate",
      code: "blocked",
      creator: "marmiton.org",
    });
    expect(d.fetchPage).not.toHaveBeenCalled();
  });

  it("offers my copy instead of a new one", async () => {
    const d = deps({
      findMyCopy: vi.fn(async (key: string) =>
        key === "web:marmiton.org/recettes/recette_gratin_1.aspx"
          ? {
              slug: "gratin-dauphinois",
              title: "Gratin dauphinois",
              saved: false,
            }
          : null,
      ),
    });
    expect(
      await importFromUrl(
        d,
        "https://marmiton.org/recettes/recette_gratin_1.aspx/",
      ),
    ).toMatchObject({
      kind: "duplicate",
      recipe: { slug: "gratin-dauphinois" },
    });
  });

  it("reports missing pages and pages without a recipe", async () => {
    expect(
      await importFromUrl(
        deps({ fetchPage: vi.fn(async (url: string) => page(url, "", 410)) }),
        "https://blog.fr/x",
      ),
    ).toEqual({ kind: "failed", code: "not_found" });
    expect(
      await importFromUrl(
        deps({
          fetchPage: vi.fn(async (url: string) => page(url, "<p>Bonjour</p>")),
        }),
        "https://blog.fr/x",
      ),
    ).toEqual({ kind: "failed", code: "no_recipe" });
    expect(await importFromUrl(deps(), "http://localhost/x")).toEqual({
      kind: "failed",
      code: "invalid_url",
    });
  });

  it("follows a link shortener by its headers", async () => {
    const d = deps({
      resolveShortLink: vi.fn(
        async () => "https://www.marmiton.org/recettes/recette_gratin_1.aspx",
      ),
    });
    expect((await importFromUrl(d, "https://bit.ly/gratin")).kind).toBe(
      "draft",
    );
  });
});

describe("importFromUrl — TikTok, YouTube, Instagram", () => {
  it("resolves a TikTok short link and credits the account", async () => {
    const d = deps({
      resolveShortLink: vi.fn(
        async () => "https://www.tiktok.com/@/video/7440114099565972791?_r=1",
      ),
    });
    const outcome = await importFromUrl(d, "https://vm.tiktok.com/ZMhvqjqjq/");
    expect(outcome).toMatchObject({
      kind: "draft",
      draft: {
        sourceUrl:
          "https://www.tiktok.com/@maya.cuisine/video/7440114099565972791",
        sourceAuthor: "@maya.cuisine",
        method: "heuristic",
        reformulated: false,
      },
    });
    expect(d.checkCreator).toHaveBeenCalledWith(
      "https://www.tiktok.com/@maya.cuisine/video/7440114099565972791",
      expect.objectContaining({ platform: "tiktok", handle: "maya.cuisine" }),
    );
  });

  it("asks for the caption when TikTok's is too short, and respects a withdrawal", async () => {
    const short = deps({
      tiktokPost: vi.fn(async () => ({
        url: "https://www.tiktok.com/@maya.cuisine/video/7312345678901234567",
        handle: "maya.cuisine",
        caption: "Trop bon #food",
      })),
    });
    expect(
      await importFromUrl(
        short,
        "https://www.tiktok.com/@maya.cuisine/video/7312345678901234567",
      ),
    ).toMatchObject({
      kind: "needs_input",
      ask: "caption",
      sourceAuthor: "@maya.cuisine",
      title: "Trop bon #food",
    });
    const withdrawn = deps({
      checkCreator: vi.fn(async () => ({ ...OPEN, withdrawn: true })),
    });
    expect(
      await importFromUrl(
        withdrawn,
        "https://www.tiktok.com/@maya.cuisine/video/7312345678901234567",
      ),
    ).toMatchObject({
      kind: "gate",
      code: "withdrawn",
      creator: "@maya.cuisine",
    });
  });

  it("reads a YouTube description, or asks for it with its recipe links", async () => {
    const ok = await importFromUrl(
      deps(),
      "https://youtu.be/dQw4w9WgXcQ?si=zz",
    );
    expect(ok).toMatchObject({
      kind: "draft",
      draft: {
        sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        sourceAuthor: "@hervecuisine",
      },
    });
    const noKey = deps({
      youtubeVideo: vi.fn(async () => ({
        title: "Gratin express",
        description: null,
        handle: "hervecuisine",
      })),
    });
    expect(
      await importFromUrl(noKey, "https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toMatchObject({
      kind: "needs_input",
      ask: "caption",
      title: "Gratin express",
      links: [],
    });
    const linked = deps({
      youtubeVideo: vi.fn(async () => ({
        title: "Gratin express",
        description:
          "La recette écrite est sur mon site : https://hervecuisine.com/recette/gratin-express/",
        handle: "hervecuisine",
      })),
    });
    expect(
      await importFromUrl(
        linked,
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      ),
    ).toMatchObject({
      kind: "needs_input",
      links: ["https://hervecuisine.com/recette/gratin-express/"],
    });
  });

  it("asks Instagram captions to be pasted, and refuses profile links", async () => {
    expect(
      await importFromUrl(
        deps(),
        "https://www.instagram.com/p/C1aBcD2eFgH/?igsh=x",
      ),
    ).toMatchObject({
      kind: "needs_input",
      ask: "caption",
      platform: "instagram",
      sourceUrl: "https://www.instagram.com/p/C1aBcD2eFgH/",
    });
    expect(
      await importFromUrl(deps(), "https://www.instagram.com/maya.cuisine/"),
    ).toEqual({
      kind: "failed",
      code: "not_a_post",
    });
  });
});

describe("importFromUrl — Pinterest", () => {
  it("imports the pin's site, credited to it", async () => {
    const d = deps({
      resolveShortLink: vi.fn(
        async () =>
          "https://www.pinterest.com/pin/99360735500167749/sent/?invite_code=x",
      ),
      pinterestOrigin: vi.fn(
        async () => "https://www.marmiton.org/recettes/recette_gratin_1.aspx",
      ),
    });
    const outcome = await importFromUrl(d, "https://pin.it/1a2b3c4");
    expect(d.pinterestOrigin).toHaveBeenCalledWith("99360735500167749");
    expect(outcome).toMatchObject({
      kind: "draft",
      via: "pinterest",
      draft: {
        sourceUrl: "https://www.marmiton.org/recettes/recette_gratin_1.aspx",
      },
    });
  });

  it("asks for the site when the pin has none", async () => {
    expect(
      await importFromUrl(
        deps(),
        "https://www.pinterest.fr/pin/99360735500167749/",
      ),
    ).toMatchObject({
      kind: "needs_input",
      ask: "site_link",
      sourceUrl: null,
    });
  });

  it("goes to a pinned video through its own path", async () => {
    const d = deps({
      pinterestOrigin: vi.fn(
        async () => "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      ),
    });
    expect(
      await importFromUrl(d, "https://www.pinterest.fr/pin/99360735500167749/"),
    ).toMatchObject({
      kind: "draft",
      via: "pinterest",
      draft: { sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });
  });
});

describe("pasted text and captures", () => {
  it("imports a pasted caption with the typed @", async () => {
    const d = deps();
    const outcome = await importFromText(d, {
      text: CAPTION,
      title: null,
      sourceUrl: "https://www.instagram.com/p/C1aBcD2eFgH/",
      sourceAuthor: "@maya.cuisine",
    });
    expect(outcome).toMatchObject({
      kind: "draft",
      draft: {
        sourceAuthor: "@maya.cuisine",
        sourceUrl: "https://www.instagram.com/p/C1aBcD2eFgH/",
      },
    });
    expect(d.checkCreator).toHaveBeenCalledWith(
      "https://www.instagram.com/p/C1aBcD2eFgH/",
      expect.objectContaining({
        platform: "instagram",
        handle: "maya.cuisine",
      }),
    );
  });

  it("needs the AI for captures", async () => {
    expect(
      await importFromImages(deps(), {
        images: [{ base64: "x", mediaType: "image/jpeg" }],
        note: null,
        sourceUrl: null,
        sourceAuthor: null,
      }),
    ).toEqual({ kind: "failed", code: "needs_ai" });
  });
});
