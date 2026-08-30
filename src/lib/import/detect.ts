export type ImportPlatform = "instagram" | "tiktok" | "youtube" | "web";

const PRIVATE_HOST_PATTERN =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1\]?$|172\.(1[6-9]|2\d|3[01])\.)/i;

/**
 * Classify an import URL by platform. Returns null for anything that is not
 * a safe public http(s) URL (SSRF guard: no localhost / private ranges).
 */
export function detectPlatform(raw: string): ImportPlatform | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (PRIVATE_HOST_PATTERN.test(host) || !host.includes(".")) return null;

  if (host === "instagr.am" || host.endsWith("instagram.com")) {
    return "instagram";
  }
  if (host.endsWith("tiktok.com")) return "tiktok";
  if (host === "youtu.be" || host.endsWith("youtube.com")) return "youtube";
  return "web";
}
