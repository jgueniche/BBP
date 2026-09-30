// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import zlib from "node:zlib";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  checkOutboundUrl,
  isOnSite,
  isPublicAddress,
  parseIPv6,
  redirectTarget,
} from "./address";
import { decodeText, detectCharset } from "./charset";
import { createTransport, proxyFromEnv } from "./transport";

describe("isPublicAddress", () => {
  it("accepts public addresses", () => {
    for (const ip of [
      "151.101.1.91",
      "8.8.8.8",
      "2a04:4e42:600::347",
      "2001:4860:4860::8888",
      "::ffff:151.101.1.91",
    ]) {
      expect(isPublicAddress(ip), ip).toBe(true);
    }
  });

  it("refuses private, reserved and special addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "224.0.0.1",
      "255.255.255.255",
      "198.18.0.1",
      "::1",
      "::",
      "fe80::1",
      "fc00::1",
      "fd12:3456::1",
      "ff02::1",
      "::ffff:127.0.0.1",
      "::ffff:7f00:1",
      "64:ff9b::a9fe:a9fe",
      "2001:db8::1",
      "2002:c0a8:101::1",
      "[::1]",
      "fe80::1%eth0",
      "not-an-ip",
    ]) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
  });

  it("parses IPv6 forms", () => {
    expect(parseIPv6("::")).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(parseIPv6("1::")).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
    expect(parseIPv6("::ffff:1.2.3.4")).toEqual([
      0, 0, 0, 0, 0, 0xffff, 0x0102, 0x0304,
    ]);
    expect(parseIPv6("1:2:3:4:5:6:7:8")).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(parseIPv6("1::2::3")).toBeNull();
    expect(parseIPv6("1:2:3:4:5:6:7:8:9")).toBeNull();
    expect(parseIPv6(":1")).toBeNull();
  });
});

describe("checkOutboundUrl", () => {
  it("keeps public http(s) URLs on default ports", () => {
    expect(
      checkOutboundUrl("https://www.marmiton.org/recettes/x.aspx")?.href,
    ).toBe("https://www.marmiton.org/recettes/x.aspx");
    expect(checkOutboundUrl("http://blog.example.fr:80/tarte")).not.toBeNull();
    expect(checkOutboundUrl("https://151.101.1.91/")).not.toBeNull();
  });

  it("refuses everything else", () => {
    for (const raw of [
      "ftp://example.com/x",
      "file:///etc/passwd",
      "https://user:pass@example.com/",
      "https://example.com:8443/",
      "http://localhost/",
      "http://printer.local/",
      "http://intranet/",
      "http://127.0.0.1/",
      "http://2130706433/",
      "http://0x7f000001/",
      "http://[::1]/",
      "http://169.254.169.254/latest/meta-data",
      "http://metadata.google.internal/",
      "not a url",
    ]) {
      expect(checkOutboundUrl(raw), raw).toBeNull();
    }
  });

  it("re-checks redirects and never downgrades to http", () => {
    const from = new URL("https://www.750g.com/a");
    expect(redirectTarget(from, "/b")?.href).toBe("https://www.750g.com/b");
    expect(redirectTarget(from, "http://www.750g.com/b")).toBeNull();
    expect(redirectTarget(from, "https://169.254.169.254/")).toBeNull();
    expect(redirectTarget(from, undefined)).toBeNull();
    expect(
      redirectTarget(new URL("http://blog.fr/"), "https://blog.fr/x")?.href,
    ).toBe("https://blog.fr/x");
  });
});

describe("isOnSite", () => {
  it("accepts the site and its subdomains only", () => {
    expect(isOnSite("www.marmiton.org", "marmiton.org")).toBe(true);
    expect(isOnSite("marmiton.org", "marmiton.org")).toBe(true);
    expect(isOnSite("marmiton.org.evil.fr", "marmiton.org")).toBe(false);
    expect(isOnSite("notmarmiton.org", "marmiton.org")).toBe(false);
  });
});

describe("charset", () => {
  const latin1 = new Uint8Array([0x63, 0x72, 0xe8, 0x6d, 0x65]); // « crème »

  it("reads the header, then the meta tag, then UTF-8", () => {
    expect(detectCharset("text/html; charset=ISO-8859-1", latin1)).toBe(
      "iso-8859-1",
    );
    const withMeta = new TextEncoder().encode(
      '<html><head><meta http-equiv="Content-Type" content="text/html; charset=windows-1252">',
    );
    expect(detectCharset("text/html", withMeta)).toBe("windows-1252");
    expect(detectCharset(null, new TextEncoder().encode("<p>é</p>"))).toBe(
      "utf-8",
    );
  });

  it("decodes Latin-1 pages without garbling accents", () => {
    expect(decodeText(latin1, "text/html; charset=iso-8859-1")).toBe("crème");
    expect(
      decodeText(new TextEncoder().encode("\ufeffcrème"), "text/html"),
    ).toBe("crème");
    expect(decodeText(latin1, "text/html; charset=nonsense-9")).toBe(
      "cr\ufffdme",
    );
  });
});

describe("proxyFromEnv", () => {
  it("is only a development tool", () => {
    expect(proxyFromEnv({ HTTPS_PROXY: "http://127.0.0.1:3128" })?.port).toBe(
      "3128",
    );
    expect(
      proxyFromEnv({ HTTPS_PROXY: "http://127.0.0.1:3128", VERCEL: "1" }),
    ).toBeNull();
    expect(proxyFromEnv({})).toBeNull();
  });
});

describe("transport", () => {
  let server: http.Server;
  let port = 0;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const path = req.url ?? "/";
      if (path === "/host") {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(req.headers.host ?? "");
      } else if (path === "/page") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end("<h1>Tarte aux pommes</h1>");
      } else if (path === "/latin") {
        res.writeHead(200, { "content-type": "text/html; charset=iso-8859-1" });
        res.end(Buffer.from([0x63, 0x72, 0xe8, 0x6d, 0x65]));
      } else if (path === "/gzip") {
        res.writeHead(200, {
          "content-type": "text/html",
          "content-encoding": "gzip",
        });
        res.end(zlib.gzipSync("<p>compressée</p>"));
      } else if (path === "/big") {
        res.writeHead(200, { "content-type": "text/html" });
        res.end("x".repeat(50_000));
      } else if (path === "/missing") {
        res.writeHead(410, { "content-type": "text/html" });
        res.end("gone");
      } else if (path === "/to-page") {
        res.writeHead(301, { location: "/page" });
        res.end();
      } else if (path === "/to-other-site") {
        res.writeHead(302, { location: `http://site-b.test:${port}/page` });
        res.end();
      } else if (path === "/to-private-name") {
        res.writeHead(302, { location: `http://evil.test:${port}/page` });
        res.end();
      } else if (path === "/to-metadata") {
        res.writeHead(302, { location: "http://169.254.169.254/latest" });
        res.end();
      } else if (path === "/loop") {
        res.writeHead(302, { location: "/loop" });
        res.end();
      } else if (path === "/short") {
        res.writeHead(302, { location: `http://site-b.test:${port}/video/42` });
        res.end("<p>never read</p>");
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    // All interfaces: « evil.test » (127.0.0.3) would connect if the
    // resolved address were not checked.
    await new Promise<void>((resolve) => server.listen(0, "0.0.0.0", resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  // Test hosts, resolved only by this lookup: « evil.test » plays a
  // private address (127.0.0.3).
  const names: Record<string, string> = {
    "site-a.test": "127.0.0.1",
    "site-b.test": "127.0.0.1",
    "evil.test": "127.0.0.3",
  };
  const transport = createTransport({
    checkUrl: (raw) => {
      const url = new URL(raw);
      return url.hostname.endsWith(".test") ? url : checkOutboundUrl(url);
    },
    lookup: async (hostname) => {
      const address = names[hostname];
      if (!address) throw new Error("ENOTFOUND");
      return [{ address, family: 4 }];
    },
    isAllowedAddress: (address) => address === "127.0.0.1",
    proxy: null,
    userAgent: "test",
  });
  const at = (path: string, host = "site-a.test") =>
    `http://${host}:${port}${path}`;

  it("reads a page and reports where it ended", async () => {
    const page = await transport.fetchPage(at("/to-page"));
    expect(page).toMatchObject({ ok: true, status: 200 });
    expect(page?.url).toBe(at("/page"));
    expect(page?.text).toContain("Tarte aux pommes");
  });

  it("sends the Host header of the page", async () => {
    expect((await transport.fetchPage(at("/host")))?.text).toBe(
      `site-a.test:${port}`,
    );
  });

  it("decodes charsets and compression", async () => {
    expect((await transport.fetchPage(at("/latin")))?.text).toBe("crème");
    expect((await transport.fetchPage(at("/gzip")))?.text).toBe(
      "<p>compressée</p>",
    );
  });

  it("caps the size", async () => {
    const page = await transport.fetchPage(at("/big"), { maxBytes: 1_000 });
    expect(page?.text.length).toBe(1_000);
  });

  it("reports failures without a body", async () => {
    expect(await transport.fetchPage(at("/missing"))).toMatchObject({
      ok: false,
      status: 410,
      text: "",
    });
  });

  it("checks every redirect again", async () => {
    expect(await transport.fetchPage(at("/to-metadata"))).toBeNull();
    expect(await transport.fetchPage(at("/to-private-name"))).toBeNull();
    expect(await transport.fetchPage(at("/loop"))).toBeNull();
    expect(
      await transport.fetchPage(at("/to-other-site"), {
        allowHost: (host) => host === "site-a.test",
      }),
    ).toBeNull();
    expect((await transport.fetchPage(at("/to-other-site")))?.url).toBe(
      at("/page", "site-b.test"),
    );
  });

  it("refuses a host that resolves to a private address", async () => {
    expect(await transport.fetchPage(at("/page", "evil.test"))).toBeNull();
    expect(await transport.fetchPage(at("/page", "unknown.test"))).toBeNull();
  });

  it("follows short links from their headers only", async () => {
    const resolved = await transport.resolveRedirects(at("/short"), {
      isResolved: (url) => url.pathname.startsWith("/video/"),
      allowHost: (host) => host.endsWith(".test"),
    });
    expect(resolved).toBe(at("/video/42", "site-b.test"));
    expect(
      await transport.resolveRedirects(at("/short"), {
        isResolved: (url) => url.pathname.startsWith("/video/"),
        allowHost: (host) => host === "site-a.test",
      }),
    ).toBeNull();
    expect(
      await transport.resolveRedirects(at("/page"), {
        isResolved: (url) => url.pathname.startsWith("/video/"),
        allowHost: () => true,
      }),
    ).toBeNull();
  });
});
