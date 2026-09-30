// Small, dependency-free HTML helpers for recipe pages (no DOM on the
// server): entities, visible text, canonical address, meta tags.

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  laquo: "«",
  raquo: "»",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  sbquo: "‚",
  bdquo: "„",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  middot: "·",
  bull: "•",
  deg: "°",
  times: "×",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  frasl: "⁄",
  euro: "€",
  copy: "©",
  reg: "®",
  trade: "™",
  oelig: "œ",
  OElig: "Œ",
  aelig: "æ",
  AElig: "Æ",
  szlig: "ß",
  thinsp: " ",
  ensp: " ",
  emsp: " ",
  shy: "",
  zwj: "",
  zwnj: "",
};

// Accented letters: « &eacute; », « &Agrave; », « &ccedil; »…
const ACCENTS: Record<string, string> = {
  acute: "\u0301",
  grave: "\u0300",
  circ: "\u0302",
  uml: "\u0308",
  tilde: "\u0303",
  cedil: "\u0327",
  ring: "\u030a",
};

function namedEntity(name: string): string | null {
  const direct = NAMED_ENTITIES[name];
  if (direct !== undefined) return direct;
  const match = /^([a-zA-Z])(acute|grave|circ|uml|tilde|cedil|ring)$/.exec(
    name,
  );
  if (match) return `${match[1]}${ACCENTS[match[2]!]}`.normalize("NFC");
  return null;
}

/** Decodes HTML entities (named, decimal and hexadecimal). */
export function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z][a-z0-9]{1,8});/gi,
    (whole, body: string) => {
      if (body[0] === "#") {
        const code =
          body[1] === "x" || body[1] === "X"
            ? parseInt(body.slice(2), 16)
            : parseInt(body.slice(1), 10);
        if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) {
          return whole;
        }
        return code === 0xa0 ? " " : String.fromCodePoint(code);
      }
      return namedEntity(body) ?? whole;
    },
  );
}

/** Text of an HTML fragment: tags removed, entities decoded, spaces folded. */
export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

const NOISE =
  /<(script|style|noscript|svg|nav|header|footer|aside|form|iframe|template|button|select)\b[\s\S]*?<\/\1\s*>/gi;

/**
 * The readable text of a page, for the importer when it has no structured
 * recipe: the <article> or <main> when there is one, without navigation,
 * scripts or forms, one block per line.
 */
export function pageText(html: string, maxLength = 20_000): string {
  const cleaned = html.replace(/<!--[\s\S]*?-->/g, " ").replace(NOISE, " ");
  const main =
    /<article\b[\s\S]*<\/article>/i.exec(cleaned)?.[0] ??
    /<main\b[\s\S]*<\/main>/i.exec(cleaned)?.[0] ??
    /<body\b[\s\S]*<\/body>/i.exec(cleaned)?.[0] ??
    cleaned;
  return decodeEntities(
    main
      .replace(
        /<(br|\/p|\/li|\/h\d|\/div|\/tr|\/section|\/ol|\/ul)\b[^>]*>/gi,
        "\n",
      )
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim()
    .slice(0, maxLength);
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(
    `\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  ).exec(tag);
  if (!match) return null;
  return decodeEntities(match[2] ?? match[3] ?? match[4] ?? "").trim();
}

/** content of <meta property|name="…">, e.g. « og:title ». */
export function metaContent(html: string, key: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = attribute(tag, "property") ?? attribute(tag, "name");
    if (name?.toLowerCase() === key.toLowerCase()) {
      const content = attribute(tag, "content");
      if (content) return content;
    }
  }
  return null;
}

const SECOND_LEVEL = new Set([
  "co.uk",
  "org.uk",
  "com.au",
  "co.nz",
  "co.jp",
  "com.br",
  "com.mx",
  "co.za",
  "com.tr",
  "com.ar",
]);

/** « cuisine.journaldesfemmes.fr » → « journaldesfemmes.fr ». */
export function registrableDomain(host: string): string {
  const labels = host.toLowerCase().replace(/\.$/, "").split(".");
  if (labels.length <= 2) return labels.join(".");
  const lastTwo = labels.slice(-2).join(".");
  return SECOND_LEVEL.has(lastTwo) ? labels.slice(-3).join(".") : lastTwo;
}

const TRACKING =
  /^(utm_\w+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|igsh|_ga|ref|ref_src|si|share_id)$/i;

/** The address without tracking parameters nor fragment. */
export function withoutTracking(raw: string): string {
  const url = new URL(raw);
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING.test(key)) url.searchParams.delete(key);
  }
  url.hash = "";
  return url.href;
}

/**
 * The page's canonical address (<link rel="canonical"> or og:url), kept only
 * on the same site: a page cannot hand its credit to another domain.
 */
export function canonicalUrl(html: string, pageUrl: string): string {
  const fallback = withoutTracking(pageUrl);
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return fallback;
  }
  const link = (html.match(/<link\b[^>]*>/gi) ?? []).find((tag) =>
    /\brel\s*=\s*["']?canonical\b/i.test(tag),
  );
  const candidate =
    (link ? attribute(link, "href") : null) ?? metaContent(html, "og:url");
  if (!candidate) return fallback;
  try {
    const url = new URL(candidate, base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return fallback;
    if (registrableDomain(url.hostname) !== registrableDomain(base.hostname)) {
      return fallback;
    }
    if (base.protocol === "https:" && url.protocol === "http:") {
      url.protocol = "https:";
    }
    return withoutTracking(url.href);
  } catch {
    return fallback;
  }
}
