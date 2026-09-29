import { fr } from "@/i18n/fr";

import type { CreatorPlatform } from "./identity";

const t = fr.creators.credit;

/**
 * « D'après une vidéo de » (TikTok, YouTube), « D'après une publication de »
 * (Instagram), « D'après » (a site): the recipe text is ours, reformulated;
 * the idea is hers.
 */
export function creditPrefix(platform: CreatorPlatform): string {
  if (platform === "tiktok" || platform === "youtube") return t.video;
  if (platform === "instagram") return t.post;
  return t.site;
}
