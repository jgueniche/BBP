import { describe, expect, it } from "vitest";

import { claimMethod, generateClaimCode, pageHasClaimCode } from "./claim";
import { creditPrefix, creditView, safeOutboundUrl } from "./credit";
import { embedFor } from "./embed";
import {
  creatorFromSource,
  creatorLabel,
  creatorPath,
  domainOf,
  normalizeCreatorHandle,
} from "./identity";

describe("creator identity", () => {
  it("reads the @handle of a TikTok or YouTube link", () => {
    expect(
      creatorFromSource({
        sourceUrl:
          "https://www.tiktok.com/@Maya.Cuisine/video/7212345678901234567?is_from_webapp=1",
        sourceAuthor: "Maya en cuisine",
      }),
    ).toEqual({
      platform: "tiktok",
      handle: "maya.cuisine",
      profileUrl: "https://www.tiktok.com/@maya.cuisine",
    });
    expect(
      creatorFromSource({
        sourceUrl: "https://youtu.be/AbCdEf12345",
        sourceAuthor: "@herve.cuisine",
      })?.handle,
    ).toBe("herve.cuisine");
    // A YouTube channel name is not a handle: no guess.
    expect(
      creatorFromSource({
        sourceUrl: "https://youtu.be/AbCdEf12345",
        sourceAuthor: "Hervé Cuisine",
      }),
    ).toBeNull();
  });

  it("takes the credit typed for Instagram, with or without @", () => {
    expect(
      creatorFromSource({
        sourceUrl: "https://www.instagram.com/p/C1AbC-d_2/",
        sourceAuthor: "@Nour.en.cuisine",
      }),
    ).toEqual({
      platform: "instagram",
      handle: "nour.en.cuisine",
      profileUrl: "https://www.instagram.com/nour.en.cuisine/",
    });
    expect(
      creatorFromSource({
        sourceUrl: "https://www.instagram.com/p/C1AbC-d_2/",
        sourceAuthor: "cheffe",
      })?.handle,
    ).toBe("cheffe");
    expect(
      creatorFromSource({
        sourceUrl: "https://www.instagram.com/p/C1AbC-d_2/",
        sourceAuthor: "Chef Nour",
      }),
    ).toBeNull();
  });

  it("names a website after its domain", () => {
    expect(
      creatorFromSource({
        sourceUrl: "https://WWW.Marmiton.org/recettes/recette_tarte.aspx?utm=1",
        sourceAuthor: "Chef Simon",
      }),
    ).toEqual({
      platform: "web",
      handle: "marmiton.org",
      profileUrl: "https://marmiton.org",
    });
    expect(domainOf("tonsite.fr")).toBe("tonsite.fr");
    expect(domainOf("https://www.blog.exemple.com/page")).toBe(
      "blog.exemple.com",
    );
    expect(domainOf("localhost")).toBeNull();
    expect(
      creatorFromSource({ sourceUrl: null, sourceAuthor: "@x" }),
    ).toBeNull();
    expect(
      creatorFromSource({
        sourceUrl: "http://127.0.0.1/x",
        sourceAuthor: null,
      }),
    ).toBeNull();
  });

  it("keeps each platform's handle rules", () => {
    expect(normalizeCreatorHandle("instagram", "@_la.cuisine_")).toBe(
      "_la.cuisine_",
    );
    expect(normalizeCreatorHandle("tiktok", "a")).toBeNull();
    expect(normalizeCreatorHandle("youtube", "@chef-simon")).toBe("chef-simon");
    expect(normalizeCreatorHandle("instagram", "chef-simon")).toBeNull();
    expect(normalizeCreatorHandle("web", "https://www.Exemple.fr/x")).toBe(
      "exemple.fr",
    );
  });

  it("labels and links a creator", () => {
    expect(creatorLabel("tiktok", "maya.cuisine")).toBe("@maya.cuisine");
    expect(creatorLabel("web", "marmiton.org")).toBe("marmiton.org");
    expect(creatorPath("instagram", "nour.en.cuisine")).toBe(
      "/createrices/instagram/nour.en.cuisine",
    );
  });

  it("credits the idea, not a text she did not write", () => {
    expect(creditPrefix("tiktok")).toBe("D'après une vidéo de");
    expect(creditPrefix("youtube")).toBe("D'après une vidéo de");
    expect(creditPrefix("instagram")).toBe("D'après une publication de");
    expect(creditPrefix("web")).toBe("D'après le site");
  });

  it("links the credit to her page when the creator is known", () => {
    expect(
      creditView(
        {
          sourceUrl: "https://www.tiktok.com/@maya.cuisine/video/1",
          sourceAuthor: "Maya",
        },
        { platform: "tiktok", handle: "maya.cuisine", verified: true },
      ),
    ).toEqual({
      prefix: "D'après une vidéo de",
      name: "@maya.cuisine",
      href: "/createrices/tiktok/maya.cuisine",
      verified: true,
    });
    // Unknown creator: the name given at import, never a link.
    expect(
      creditView(
        {
          sourceUrl: "https://www.instagram.com/p/C1AbC-d_2/",
          sourceAuthor: "Chef Nour",
        },
        null,
      ),
    ).toEqual({
      prefix: "D'après une publication de",
      name: "Chef Nour",
      href: null,
      verified: false,
    });
    expect(
      creditView(
        {
          sourceUrl: "https://www.marmiton.org/recettes/x.aspx",
          sourceAuthor: "Chef Simon",
        },
        null,
      ).name,
    ).toBe("marmiton.org");
    expect(
      creditView(
        { sourceUrl: "https://youtu.be/AbCdEf12345", sourceAuthor: null },
        null,
      ),
    ).toEqual({
      prefix: "D'après l'original",
      name: null,
      href: null,
      verified: false,
    });
  });

  it("only sends visitors to a public web address", () => {
    expect(
      safeOutboundUrl("https://www.tiktok.com/@maya.cuisine/video/1"),
    ).toBe("https://www.tiktok.com/@maya.cuisine/video/1");
    expect(safeOutboundUrl("javascript:alert(1)")).toBeNull();
    expect(safeOutboundUrl("http://127.0.0.1/admin")).toBeNull();
    expect(safeOutboundUrl(null)).toBeNull();
  });
});

describe("official players", () => {
  it("uses each platform's own player, never a copy", () => {
    expect(
      embedFor(
        "https://www.tiktok.com/@maya.cuisine/video/7212345678901234567",
      ),
    ).toEqual({
      platform: "tiktok",
      src: "https://www.tiktok.com/player/v1/7212345678901234567",
      shape: "portrait",
    });
    expect(
      embedFor("https://m.youtube.com/watch?feature=share&v=AbCdEf12345"),
    ).toEqual({
      platform: "youtube",
      src: "https://www.youtube-nocookie.com/embed/AbCdEf12345",
      shape: "landscape",
    });
    expect(embedFor("https://www.youtube.com/shorts/AbCdEf12345")?.shape).toBe(
      "portrait",
    );
    expect(embedFor("https://youtu.be/AbCdEf12345?si=x")?.src).toBe(
      "https://www.youtube-nocookie.com/embed/AbCdEf12345",
    );
    expect(
      embedFor("https://www.instagram.com/reel/C1AbC-d_2/?igsh=1")?.src,
    ).toBe("https://www.instagram.com/p/C1AbC-d_2/embed");
  });

  it("has no player for a site or an unreadable link", () => {
    expect(embedFor("https://www.marmiton.org/recettes/x.aspx")).toBeNull();
    expect(embedFor("https://vm.tiktok.com/ZMabc123/")).toBeNull();
    expect(embedFor(null)).toBeNull();
  });
});

describe("claims", () => {
  it("makes readable codes the database accepts", () => {
    const code = generateClaimCode((size) =>
      Uint8Array.from({ length: size }, (_, i) => i * 7),
    );
    expect(code).toMatch(/^copine-[a-z0-9]{8}$/);
    expect(code.slice("copine-".length)).not.toMatch(/[01ilo]/);
    expect(generateClaimCode()).toMatch(/^copine-[a-z0-9]{8}$/);
    expect(generateClaimCode()).not.toBe(generateClaimCode());
  });

  it("finds the code anywhere on the home page", () => {
    const html =
      '<html><head><meta name="copine-en-cuisine" content="COPINE-7F3KQ2AB"></head></html>';
    expect(pageHasClaimCode(html, "copine-7f3kq2ab")).toBe(true);
    expect(pageHasClaimCode(html, "copine-aaaaaaaa")).toBe(false);
  });

  it("checks a site itself, an account by hand", () => {
    expect(claimMethod("web")).toBe("site");
    expect(claimMethod("instagram")).toBe("bio");
  });
});
