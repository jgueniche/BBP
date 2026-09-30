// Outbound requests of the importer only reach the public internet (SSRF
// guard): these rules run on every URL, every redirect and every address a
// host name resolves to.

const V4_BLOCKED: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8], // this network
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link local, cloud metadata
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
];

// Inside the global unicast range 2000::/3, still not the public internet.
const V6_BLOCKED: ReadonlyArray<readonly [string, number]> = [
  ["2001::", 23], // IETF protocol assignments (Teredo, benchmarking…)
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4
  ["3fff::", 20], // documentation
];

/** « 192.168.1.10 » → its 32-bit value, or null. */
export function parseIPv4(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value;
}

/** An IPv6 address as its eight 16-bit groups, or null. */
export function parseIPv6(raw: string): number[] | null {
  let ip = raw.trim().toLowerCase();
  if (ip.startsWith("[") && ip.endsWith("]")) ip = ip.slice(1, -1);
  const zone = ip.indexOf("%");
  if (zone !== -1) ip = ip.slice(0, zone);
  if (!ip.includes(":") || /[^0-9a-f:.]/.test(ip)) return null;
  const halves = ip.split("::");
  if (halves.length > 2) return null;

  const groupsOf = (part: string): number[] | null => {
    if (part === "") return [];
    const items = part.split(":");
    const groups: number[] = [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i]!;
      if (item.includes(".")) {
        const v4 = i === items.length - 1 ? parseIPv4(item) : null;
        if (v4 === null) return null;
        groups.push(Math.floor(v4 / 65536), v4 % 65536);
      } else if (/^[0-9a-f]{1,4}$/.test(item)) {
        groups.push(parseInt(item, 16));
      } else {
        return null;
      }
    }
    return groups;
  };

  const head = groupsOf(halves[0]!);
  const tail = halves.length === 2 ? groupsOf(halves[1]!) : [];
  if (!head || !tail) return null;
  if (halves.length === 1) return head.length === 8 ? head : null;
  const missing = 8 - head.length - tail.length;
  if (missing < 1) return null;
  return [...head, ...new Array<number>(missing).fill(0), ...tail];
}

function inV4(ip: number, base: string, prefix: number): boolean {
  const size = 2 ** (32 - prefix);
  return Math.floor(ip / size) === Math.floor(parseIPv4(base)! / size);
}

function inV6(groups: number[], base: string, prefix: number): boolean {
  const reference = parseIPv6(base)!;
  let bits = prefix;
  for (let i = 0; i < 8 && bits > 0; i += 1) {
    const take = Math.min(16, bits);
    const mask = (0xffff << (16 - take)) & 0xffff;
    if ((groups[i]! & mask) !== (reference[i]! & mask)) return false;
    bits -= take;
  }
  return true;
}

function isPublicV4(ip: number): boolean {
  return !V4_BLOCKED.some(([base, prefix]) => inV4(ip, base, prefix));
}

/** Whether an IP address (v4 or v6) belongs to the public internet. */
export function isPublicAddress(address: string): boolean {
  const v4 = parseIPv4(address);
  if (v4 !== null) return isPublicV4(v4);
  const v6 = parseIPv6(address);
  if (!v6) return false;
  // IPv4-mapped (::ffff:a.b.c.d) and NAT64 (64:ff9b::a.b.c.d) carry an
  // IPv4 address: judge that one.
  if (inV6(v6, "::ffff:0:0", 96) || inV6(v6, "64:ff9b::", 96)) {
    return isPublicV4(v6[6]! * 65536 + v6[7]!);
  }
  if (!inV6(v6, "2000::", 3)) return false;
  return !V6_BLOCKED.some(([base, prefix]) => inV6(v6, base, prefix));
}

const LOCAL_NAMES =
  /(^|\.)(localhost|local|internal|intranet|lan|home\.arpa)$/i;

/**
 * A URL the importer may request: public http(s), default ports, no
 * credentials, a public host name or a public IP literal. The addresses a
 * host name resolves to are checked again when connecting.
 */
export function checkOutboundUrl(raw: string | URL): URL | null {
  let url: URL;
  try {
    url = typeof raw === "string" ? new URL(raw.trim()) : new URL(raw.href);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (url.port !== "" && url.port !== "80" && url.port !== "443") return null;
  const host = url.hostname.toLowerCase();
  if (host.length === 0) return null;
  const literal = host.replace(/^\[|\]$/g, "");
  if (parseIPv4(literal) !== null || parseIPv6(literal) !== null) {
    return isPublicAddress(literal) ? url : null;
  }
  if (!host.includes(".") || LOCAL_NAMES.test(host)) return null;
  return url;
}

/** Where a redirect leads, when it may be followed. */
export function redirectTarget(
  from: URL,
  location: string | undefined,
  check: (url: URL) => URL | null = checkOutboundUrl,
): URL | null {
  if (!location) return null;
  let next: URL;
  try {
    next = new URL(location, from);
  } catch {
    return null;
  }
  // Never from https down to http.
  if (from.protocol === "https:" && next.protocol === "http:") return null;
  return check(next);
}

/** « www.marmiton.org » is on « marmiton.org »; « marmiton.org.evil.fr » is not. */
export function isOnSite(host: string, domain: string): boolean {
  const h = host.toLowerCase();
  const d = domain.toLowerCase();
  return h === d || h.endsWith(`.${d}`);
}
