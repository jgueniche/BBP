import "server-only";

import { detectPlatform } from "./detect";

const MAX_HTML_BYTES = 1_500_000;

/**
 * Fetch a public page's HTML with a timeout and a size cap. The URL must have
 * passed detectPlatform (public http(s) host) before calling this.
 */
export async function fetchHtml(url: string): Promise<string | null> {
  if (detectPlatform(url) === null) return null;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; BBP-RecipeImport/1.0)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok || !response.body) return null;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      chunks.push(value);
      if (total > MAX_HTML_BYTES) {
        await reader.cancel();
        break;
      }
    }
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(merged);
  } catch {
    return null;
  }
}

export type OembedInfo = {
  title: string | null;
  authorName: string | null;
};

/** Official oEmbed endpoints only (brief §9 — no authenticated scraping). */
export async function fetchOembed(
  url: string,
  platform: "instagram" | "tiktok" | "youtube",
): Promise<OembedInfo | null> {
  let endpoint: string | null = null;
  if (platform === "tiktok") {
    endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  } else if (platform === "youtube") {
    endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  } else {
    const token = process.env.INSTAGRAM_OEMBED_TOKEN;
    if (!token) return null;
    endpoint = `https://graph.facebook.com/v21.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${encodeURIComponent(token)}`;
  }
  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(8_000),
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      title?: unknown;
      author_name?: unknown;
    };
    return {
      title: typeof data.title === "string" ? data.title : null,
      authorName:
        typeof data.author_name === "string" ? data.author_name : null,
    };
  } catch {
    return null;
  }
}
