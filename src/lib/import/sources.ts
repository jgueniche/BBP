import { detectPlatform, type ImportPlatform } from "./detect";

// Where a shared link comes from, and the one address we keep for it. Social
// links are canonical before any check: a short TikTok link and its long
// form are the same post (same creator gate, same duplicate).

export type SourceKind = ImportPlatform | "pinterest";

const PINTEREST_HOST = /(^|\.)pinterest\.[a-z]{2,3}(\.[a-z]{2})?$/i;

export function isPinterestHost(host: string): boolean {
  return host.toLowerCase() === "pin.it" || PINTEREST_HOST.test(host);
}

export function isTikTokHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "tiktok.com" || h.endsWith(".tiktok.com");
}

/** Like detectPlatform, with Pinterest pins told apart from other sites. */
export function detectSource(raw: string): SourceKind | null {
  const platform = detectPlatform(raw);
  if (platform !== "web") return platform;
  return isPinterestHost(new URL(raw.trim()).hostname) ? "pinterest" : "web";
}

export type SocialPost =
  | {
      platform: "tiktok";
      id: string;
      kind: "video" | "photo";
      handle: string | null;
    }
  | { platform: "instagram"; code: string; kind: "p" | "reel" | "tv" }
  | { platform: "youtube"; id: string; short: boolean };

/** vm.tiktok.com/…, vt.tiktok.com/… and tiktok.com/t/… stand for a post. */
export function isTikTokShortLink(raw: string): boolean {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    return (
      host === "vm.tiktok.com" ||
      host === "vt.tiktok.com" ||
      (isTikTokHost(host) && /^\/t\/[A-Za-z0-9]+/.test(url.pathname))
    );
  } catch {
    return false;
  }
}

export function isPinterestShortLink(raw: string): boolean {
  try {
    return new URL(raw).hostname.toLowerCase() === "pin.it";
  } catch {
    return false;
  }
}

/** The post a TikTok, Instagram or YouTube link points to, if any. */
export function socialPost(raw: string): SocialPost | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const platform = detectPlatform(url.href);
  if (platform === "tiktok") {
    const match = /\/(video|photo)\/(\d{6,25})/.exec(url.pathname);
    if (!match) return null;
    const handle = /^\/@([A-Za-z0-9._]{2,24})\//.exec(url.pathname)?.[1];
    return {
      platform,
      id: match[2]!,
      kind: match[1] as "video" | "photo",
      handle: handle ? handle.toLowerCase() : null,
    };
  }
  if (platform === "instagram") {
    const match = /\/(p|reels?|tv)\/([A-Za-z0-9_-]{5,40})/.exec(url.pathname);
    if (!match) return null;
    const kind = match[1] === "p" ? "p" : match[1] === "tv" ? "tv" : "reel";
    return { platform, code: match[2]!, kind };
  }
  if (platform === "youtube") {
    const host = url.hostname.toLowerCase();
    const fromPath = (prefix: string) =>
      new RegExp(`^/${prefix}/([A-Za-z0-9_-]{6,20})`).exec(url.pathname)?.[1];
    const short = fromPath("shorts");
    const id =
      short ??
      (host === "youtu.be"
        ? /^\/([A-Za-z0-9_-]{6,20})/.exec(url.pathname)?.[1]
        : (url.searchParams.get("v") ?? fromPath("embed") ?? fromPath("live")));
    return id && /^[A-Za-z0-9_-]{6,20}$/.test(id)
      ? { platform, id, short: short !== undefined }
      : null;
  }
  return null;
}

/** The address kept for a post: no tracking, the platform's usual form. */
export function canonicalPostUrl(post: SocialPost): string {
  switch (post.platform) {
    case "tiktok":
      return `https://www.tiktok.com/@${post.handle ?? ""}/${post.kind}/${post.id}`;
    case "instagram":
      return `https://www.instagram.com/${post.kind}/${post.code}/`;
    case "youtube":
      return post.short
        ? `https://www.youtube.com/shorts/${post.id}`
        : `https://www.youtube.com/watch?v=${post.id}`;
  }
}

/** A pin's number, from its long address (« …/pin/titre--123456/ » too). */
export function pinterestPinId(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!isPinterestHost(url.hostname) || url.hostname === "pin.it")
      return null;
    return (
      /\/pin\/(?:[^/?#]*--)?(\d{6,25})(?:[/?#]|$)/.exec(
        url.pathname + "/",
      )?.[1] ?? null
    );
  } catch {
    return null;
  }
}

const NOT_A_RECIPE_SITE =
  /(^|\.)(youtube\.com|youtu\.be|instagram\.com|tiktok\.com|facebook\.com|fb\.me|fb\.com|twitter\.com|x\.com|threads\.net|snapchat\.com|pinterest\.[a-z.]+|pin\.it|amazon\.[a-z.]+|amzn\.[a-z]+|bit\.ly|tinyurl\.com|linktr\.ee|beacons\.ai|patreon\.com|tipeee\.com|spotify\.com|apple\.com|deezer\.com|shopify\.com|etsy\.com)$/i;

/**
 * Links in a video description that lead to the written recipe on a site
 * (« La recette complète : https://… »), at most two.
 */
export function recipeLinksIn(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(/https?:\/\/[^\s<>"'()[\]{}]+/gi)) {
    const candidate = match[0].replace(/[).,;:!?»]+$/, "");
    let url: URL;
    try {
      url = new URL(candidate);
    } catch {
      continue;
    }
    if (detectSource(url.href) !== "web") continue;
    if (NOT_A_RECIPE_SITE.test(url.hostname)) continue;
    if (!/recette|recipe/i.test(url.pathname)) continue;
    url.hash = "";
    if (!found.includes(url.href)) found.push(url.href);
    if (found.length === 2) break;
  }
  return found;
}
