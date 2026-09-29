import { detectPlatform } from "@/lib/import/detect";

export const CREATOR_PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "web",
] as const;
export type CreatorPlatform = (typeof CREATOR_PLATFORMS)[number];

/** An external account or a website, as stored in public.creators. */
export type CreatorIdentity = {
  platform: CreatorPlatform;
  handle: string;
  profileUrl: string;
};

const HANDLE_RULES: Record<Exclude<CreatorPlatform, "web">, RegExp> = {
  instagram: /^[a-z0-9._]{1,30}$/,
  tiktok: /^[a-z0-9._]{2,24}$/,
  youtube: /^[a-z0-9._-]{3,30}$/,
};

const DOMAIN = /^(?=.{3,100}$)[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export function isCreatorPlatform(value: string): value is CreatorPlatform {
  return (CREATOR_PLATFORMS as readonly string[]).includes(value);
}

/** The site of a web source, without « www. » (« marmiton.org »). */
export function domainOf(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0) return null;
  let host: string;
  try {
    host = new URL(value.includes("://") ? value : `https://${value}`).hostname;
  } catch {
    return null;
  }
  host = host.toLowerCase().replace(/^www\./, "");
  return DOMAIN.test(host) ? host : null;
}

/** « @Maya.Cuisine » → « maya.cuisine », or null when the platform would refuse it. */
export function normalizeCreatorHandle(
  platform: CreatorPlatform,
  raw: string,
): string | null {
  if (platform === "web") return domainOf(raw);
  const handle = raw.trim().replace(/^@+/, "").toLowerCase();
  return HANDLE_RULES[platform].test(handle) ? handle : null;
}

export function profileUrlFor(
  platform: CreatorPlatform,
  handle: string,
): string {
  switch (platform) {
    case "instagram":
      return `https://www.instagram.com/${handle}/`;
    case "tiktok":
      return `https://www.tiktok.com/@${handle}`;
    case "youtube":
      return `https://www.youtube.com/@${handle}`;
    default:
      return `https://${handle}`;
  }
}

/** The @handle written in a TikTok or YouTube link (…/@maya.cuisine/video/…). */
export function handleFromUrl(
  platform: CreatorPlatform,
  url: string,
): string | null {
  if (platform !== "tiktok" && platform !== "youtube") return null;
  const match = /\/@([A-Za-z0-9._-]+)/.exec(url);
  return match ? normalizeCreatorHandle(platform, match[1]!) : null;
}

/**
 * The creator an import comes from: named by the link (TikTok, YouTube, a
 * site's domain) or by the credit typed at import (« @… », Instagram). Same
 * rules as the backfill of migration 202609291500.
 */
export function creatorFromSource(source: {
  sourceUrl: string | null;
  sourceAuthor: string | null;
}): CreatorIdentity | null {
  if (!source.sourceUrl) return null;
  const platform = detectPlatform(source.sourceUrl);
  if (!platform) return null;
  let handle: string | null;
  if (platform === "web") {
    handle = domainOf(source.sourceUrl);
  } else {
    handle = handleFromUrl(platform, source.sourceUrl);
    const credit = source.sourceAuthor?.trim() ?? "";
    if (!handle && (credit.startsWith("@") || platform === "instagram")) {
      handle = normalizeCreatorHandle(platform, credit);
    }
  }
  return handle
    ? { platform, handle, profileUrl: profileUrlFor(platform, handle) }
    : null;
}

/** « @maya.cuisine » for an account, the domain for a website. */
export function creatorLabel(
  platform: CreatorPlatform,
  handle: string,
): string {
  return platform === "web" ? handle : `@${handle}`;
}

export function creatorPath(platform: CreatorPlatform, handle: string): string {
  return `/createrices/${platform}/${handle}`;
}
