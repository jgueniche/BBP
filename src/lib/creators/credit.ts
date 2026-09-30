import { fr } from "@/i18n/fr";
import { detectPlatform } from "@/lib/import/detect";

import {
  creatorLabel,
  creatorPath,
  domainOf,
  type CreatorPlatform,
} from "./identity";

const t = fr.creators.credit;

/**
 * « D'après une vidéo de » (TikTok, YouTube), « D'après une publication de »
 * (Instagram), « D'après le site » (a site): the recipe text is ours,
 * reformulated; the idea is hers.
 */
export function creditPrefix(platform: CreatorPlatform): string {
  if (platform === "tiktok" || platform === "youtube") return t.video;
  if (platform === "instagram") return t.post;
  return t.site;
}

export type CreditCreator = {
  platform: CreatorPlatform;
  handle: string;
  /** Claimed and verified by the team. */
  verified: boolean;
};

export type CreditView = {
  prefix: string;
  /** « @maya.cuisine », a site, or the name given at import. */
  name: string | null;
  /** Her page on Copine, when the creator is known. */
  href: string | null;
  verified: boolean;
};

/** The « d'après » line of an imported recipe. */
export function creditView(
  source: { sourceUrl: string; sourceAuthor: string | null },
  creator: CreditCreator | null,
): CreditView {
  if (creator) {
    return {
      prefix: creditPrefix(creator.platform),
      name: creatorLabel(creator.platform, creator.handle),
      href: creatorPath(creator.platform, creator.handle),
      verified: creator.verified,
    };
  }
  const platform = detectPlatform(source.sourceUrl) ?? "web";
  const name =
    platform === "web"
      ? domainOf(source.sourceUrl)
      : source.sourceAuthor?.trim() || null;
  return name
    ? { prefix: creditPrefix(platform), name, href: null, verified: false }
    : { prefix: t.unnamed, name: null, href: null, verified: false };
}

/** Only a public http(s) address leaves through « Voir l'original ». */
export function safeOutboundUrl(raw: string | null): string | null {
  if (!raw || !detectPlatform(raw)) return null;
  return new URL(raw.trim()).toString();
}
