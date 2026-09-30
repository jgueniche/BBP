import { detectPlatform } from "@/lib/import/detect";

export type OfficialEmbed = {
  platform: "tiktok" | "youtube" | "instagram";
  src: string;
  shape: "portrait" | "landscape";
};

/**
 * The platform's own player for a post (never the video itself): shown only
 * after a tap, so nothing is loaded from the platform before that.
 */
export function embedFor(sourceUrl: string | null): OfficialEmbed | null {
  if (!sourceUrl) return null;
  const platform = detectPlatform(sourceUrl);
  if (platform === "tiktok") {
    const id = /\/video\/(\d{8,25})/.exec(sourceUrl)?.[1];
    return id
      ? {
          platform,
          src: `https://www.tiktok.com/player/v1/${id}`,
          shape: "portrait",
        }
      : null;
  }
  if (platform === "youtube") {
    const short = /\/shorts\/([A-Za-z0-9_-]{6,20})/.exec(sourceUrl)?.[1];
    const id =
      short ??
      /[?&]v=([A-Za-z0-9_-]{6,20})/.exec(sourceUrl)?.[1] ??
      /youtu\.be\/([A-Za-z0-9_-]{6,20})/.exec(sourceUrl)?.[1] ??
      /\/(?:embed|live)\/([A-Za-z0-9_-]{6,20})/.exec(sourceUrl)?.[1];
    return id
      ? {
          platform,
          src: `https://www.youtube-nocookie.com/embed/${id}`,
          shape: short ? "portrait" : "landscape",
        }
      : null;
  }
  if (platform === "instagram") {
    const code = /\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{5,40})/.exec(
      sourceUrl,
    )?.[1];
    return code
      ? {
          platform,
          src: `https://www.instagram.com/p/${code}/embed`,
          shape: "portrait",
        }
      : null;
  }
  return null;
}
