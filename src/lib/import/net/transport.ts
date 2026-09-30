import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import type { Readable } from "node:stream";
import tls from "node:tls";
import zlib from "node:zlib";

import { checkOutboundUrl, isPublicAddress, redirectTarget } from "./address";
import { decodeText } from "./charset";

export type ResolvedAddress = { address: string; family: number };

export type TransportConfig = {
  /** URLs that may be requested (checkOutboundUrl in production). */
  checkUrl: (url: string | URL) => URL | null;
  /** Resolves a host name to all its addresses. */
  lookup: (hostname: string) => Promise<ResolvedAddress[]>;
  /** Addresses a connection may reach (the public internet in production). */
  isAllowedAddress: (address: string) => boolean;
  /** Development egress proxy (HTTP CONNECT), never used on Vercel. */
  proxy: URL | null;
  userAgent: string;
};

export type FetchOptions = {
  accept?: string;
  /** Decoded bytes kept at most (the rest of the page is dropped). */
  maxBytes?: number;
  /** Budget for the whole exchange, redirects included. */
  timeoutMs?: number;
  maxRedirects?: number;
  /** Hosts the first URL and every redirect may point to. */
  allowHost?: (host: string) => boolean;
};

export type FetchedPage = {
  ok: boolean;
  status: number;
  /** The address finally reached, after redirects. */
  url: string;
  contentType: string | null;
  text: string;
};

const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const DEFAULTS = {
  accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
  maxBytes: 1_500_000,
  timeoutMs: 10_000,
  maxRedirects: 5,
};

class BlockedAddressError extends Error {
  code = "EBLOCKED";
}

function hostOf(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, "");
}

async function assertAllowed(
  hostname: string,
  config: TransportConfig,
): Promise<ResolvedAddress[]> {
  const addresses = net.isIP(hostname)
    ? [{ address: hostname, family: net.isIP(hostname) }]
    : await config.lookup(hostname);
  if (
    addresses.length === 0 ||
    addresses.some((entry) => !config.isAllowedAddress(entry.address))
  ) {
    throw new BlockedAddressError(`blocked address for ${hostname}`);
  }
  return addresses;
}

/**
 * The connection's own DNS lookup, refusing any private or reserved
 * address: what is checked is what is connected to (no rebinding window).
 */
function guardedLookup(config: TransportConfig): net.LookupFunction {
  return (hostname, options, callback) => {
    assertAllowed(hostname, config).then(
      (addresses) => {
        if (options.all) {
          callback(null, addresses);
          return;
        }
        const wanted =
          addresses.find((entry) => entry.family === options.family) ??
          addresses[0]!;
        callback(null, wanted.address, wanted.family);
      },
      (error: NodeJS.ErrnoException) => callback(error, "", 0),
    );
  };
}

function openTunnel(
  proxy: URL,
  host: string,
  port: number,
  signal: AbortSignal,
): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const target = `${net.isIPv6(host) ? `[${host}]` : host}:${port}`;
    const request = http.request({
      host: proxy.hostname,
      port: Number(proxy.port || 80),
      method: "CONNECT",
      path: target,
      headers: { host: target },
      signal,
    });
    request.on("connect", (response, socket) => {
      if (response.statusCode === 200) {
        resolve(socket);
      } else {
        socket.destroy();
        reject(new Error(`proxy refused ${target}: ${response.statusCode}`));
      }
    });
    request.on("error", reject);
    request.end();
  });
}

async function send(
  url: URL,
  accept: string,
  config: TransportConfig,
  signal: AbortSignal,
): Promise<http.IncomingMessage> {
  const secure = url.protocol === "https:";
  const host = hostOf(url);
  const port = Number(url.port || (secure ? 443 : 80));
  const headers = {
    "user-agent": config.userAgent,
    accept,
    "accept-language": "fr-FR,fr;q=0.9,en;q=0.6",
    "accept-encoding": "gzip, deflate, br",
  };

  let socket: net.Socket | tls.TLSSocket | null = null;
  if (config.proxy) {
    // The proxy resolves the name itself: check it here first.
    await assertAllowed(host, config);
    const tunnel = await openTunnel(config.proxy, host, port, signal);
    socket = secure
      ? tls.connect({
          socket: tunnel,
          servername: net.isIP(host) ? undefined : host,
        })
      : tunnel;
  }

  return new Promise((resolve, reject) => {
    const client = secure ? https : http;
    const request = client.request(
      url,
      {
        method: "GET",
        headers,
        signal,
        // Without an agent Node would take port 80 as the default and send
        // « Host: site:80 » over TLS, which some origins refuse.
        defaultPort: secure ? 443 : 80,
        // A fresh agent per request connects through guardedLookup; a
        // tunnel needs no agent at all (with agent: false, Node would
        // ignore createConnection and connect directly).
        ...(socket
          ? { createConnection: () => socket }
          : { agent: false, lookup: guardedLookup(config) }),
      },
      resolve,
    );
    request.on("error", reject);
    request.end();
  });
}

async function readBody(
  response: http.IncomingMessage,
  maxBytes: number,
): Promise<Uint8Array> {
  const encoding = (response.headers["content-encoding"] ?? "")
    .toString()
    .toLowerCase();
  let stream: Readable = response;
  if (encoding === "gzip" || encoding === "x-gzip") {
    stream = response.pipe(zlib.createGunzip());
  } else if (encoding === "deflate") {
    stream = response.pipe(zlib.createInflate());
  } else if (encoding === "br") {
    stream = response.pipe(zlib.createBrotliDecompress());
  }
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    for await (const chunk of stream) {
      const buffer = chunk as Buffer;
      chunks.push(buffer);
      total += buffer.byteLength;
      // Counted after decompression: a small gzip cannot fill the memory.
      if (total >= maxBytes) break;
    }
  } finally {
    response.destroy();
  }
  return new Uint8Array(Buffer.concat(chunks).subarray(0, maxBytes));
}

export function createTransport(config: TransportConfig) {
  /**
   * GET a public page. Every redirect is checked again (public host,
   * default ports, never https → http, allowed hosts). Null when the
   * address is refused, unreachable, too slow, or redirects too often.
   */
  async function fetchPage(
    raw: string,
    options: FetchOptions = {},
  ): Promise<FetchedPage | null> {
    const accept = options.accept ?? DEFAULTS.accept;
    const maxBytes = options.maxBytes ?? DEFAULTS.maxBytes;
    const maxRedirects = options.maxRedirects ?? DEFAULTS.maxRedirects;
    const signal = AbortSignal.timeout(options.timeoutMs ?? DEFAULTS.timeoutMs);
    let url = config.checkUrl(raw);
    try {
      for (let hop = 0; url && hop <= maxRedirects; hop += 1) {
        if (options.allowHost && !options.allowHost(url.hostname)) return null;
        const response = await send(url, accept, config, signal);
        const status = response.statusCode ?? 0;
        if (REDIRECTS.has(status)) {
          const location = response.headers.location;
          response.destroy();
          url = redirectTarget(url, location, config.checkUrl);
          continue;
        }
        const contentType = response.headers["content-type"] ?? null;
        if (status < 200 || status >= 300) {
          response.destroy();
          return { ok: false, status, url: url.href, contentType, text: "" };
        }
        const bytes = await readBody(response, maxBytes);
        return {
          ok: true,
          status,
          url: url.href,
          contentType,
          text: decodeText(bytes, contentType),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Follows a short link (vm.tiktok.com, pin.it…) to the address it stands
   * for, reading only the redirect headers, never a page.
   */
  async function resolveRedirects(
    raw: string,
    options: {
      isResolved: (url: URL) => boolean;
      allowHost: (host: string) => boolean;
      maxRedirects?: number;
      timeoutMs?: number;
    },
  ): Promise<string | null> {
    const signal = AbortSignal.timeout(options.timeoutMs ?? 8_000);
    let url = config.checkUrl(raw);
    try {
      for (let hop = 0; url && hop <= (options.maxRedirects ?? 4); hop += 1) {
        if (!options.allowHost(url.hostname)) return null;
        if (options.isResolved(url)) return url.href;
        const response = await send(url, DEFAULTS.accept, config, signal);
        const location = response.headers.location;
        const status = response.statusCode ?? 0;
        response.destroy();
        if (!REDIRECTS.has(status)) return null;
        url = redirectTarget(url, location, config.checkUrl);
      }
      return null;
    } catch {
      return null;
    }
  }

  return { fetchPage, resolveRedirects };
}

export type Transport = ReturnType<typeof createTransport>;

/** The development egress proxy from HTTPS_PROXY, ignored on Vercel. */
export function proxyFromEnv(
  env: Record<string, string | undefined> = process.env,
): URL | null {
  if (env.VERCEL) return null;
  const raw = env.HTTPS_PROXY ?? env.https_proxy;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

export const productionConfig = (): TransportConfig => ({
  checkUrl: checkOutboundUrl,
  lookup: async (hostname) =>
    dns.promises.lookup(hostname, { all: true, verbatim: true }),
  isAllowedAddress: isPublicAddress,
  proxy: proxyFromEnv(),
  userAgent: "Mozilla/5.0 (compatible; CopineEnCuisine-RecipeImport/1.0)",
});
