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
