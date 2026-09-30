import "server-only";

import {
  createTransport,
  productionConfig,
  type FetchedPage,
  type FetchOptions,
  type Transport,
} from "./net/transport";

export type { FetchedPage, FetchOptions };

let transport: Transport | null = null;

function current(): Transport {
  transport ??= createTransport(productionConfig());
  return transport;
}

/**
 * GET a public page: redirects re-checked one by one, the resolved address
 * checked when connecting, size and time capped, read in its own charset.
 */
export function fetchPage(
  url: string,
  options?: FetchOptions,
): Promise<FetchedPage | null> {
  return current().fetchPage(url, options);
}

/** A short link's target, from redirect headers only (no page is read). */
export function resolveRedirects(
  url: string,
  options: Parameters<Transport["resolveRedirects"]>[1],
): Promise<string | null> {
  return current().resolveRedirects(url, options);
}

/** The page's HTML when it answered 2xx. */
export async function fetchHtml(
  url: string,
  options?: FetchOptions,
): Promise<string | null> {
  const page = await fetchPage(url, options);
  return page?.ok ? page.text : null;
}

/** A small JSON document from an official endpoint (oEmbed, APIs). */
export async function fetchJson(
  url: string,
  options: FetchOptions = {},
): Promise<unknown | null> {
  const page = await fetchPage(url, {
    accept: "application/json",
    maxBytes: 400_000,
    timeoutMs: 8_000,
    ...options,
  });
  if (!page?.ok) return null;
  try {
    return JSON.parse(page.text) as unknown;
  } catch {
    return null;
  }
}

export type OembedInfo = {
  title: string | null;
  authorName: string | null;
  /** The account page (« https://www.tiktok.com/@maya.cuisine »), when given. */
  authorUrl: string | null;
};

/** Official oEmbed endpoints only (brief §9 — no authenticated scraping). */
export async function fetchOembed(
  url: string,
  platform: "instagram" | "tiktok" | "youtube",
): Promise<OembedInfo | null> {
  let endpoint: string;
  if (platform === "tiktok") {
    endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  } else if (platform === "youtube") {
    endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  } else {
    const token = process.env.INSTAGRAM_OEMBED_TOKEN;
    if (!token) return null;
    endpoint = `https://graph.facebook.com/v21.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${encodeURIComponent(token)}`;
  }
  const data = await fetchJson(endpoint);
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value : null);
  return {
    title: text(record.title),
    authorName: text(record.author_name),
    authorUrl: text(record.author_url),
  };
}
