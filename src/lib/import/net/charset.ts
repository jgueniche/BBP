// Pages are read in their own character set: some French sites and blogs
// still serve ISO-8859-1 or Windows-1252, which UTF-8 would garble
// (« crÃ¨me » for « crème »).

const META_CHARSET = /<meta[^>]+charset\s*=\s*["']?\s*([a-z0-9_:.-]+)/i;

function charsetParam(contentType: string | null): string | null {
  const match = /charset\s*=\s*["']?([a-z0-9_:.-]+)/i.exec(contentType ?? "");
  return match ? match[1]!.toLowerCase() : null;
}

function isKnownLabel(label: string): boolean {
  try {
    new TextDecoder(label);
    return true;
  } catch {
    return false;
  }
}

/**
 * The character set of a response: a byte-order mark, then the HTTP header,
 * then a <meta> in the first bytes, else UTF-8.
 */
export function detectCharset(
  contentType: string | null,
  bytes: Uint8Array,
): string {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return "utf-8";
  }
  const fromHeader = charsetParam(contentType);
  if (fromHeader && isKnownLabel(fromHeader)) return fromHeader;
  const head = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
  const fromMeta = META_CHARSET.exec(head)?.[1]?.toLowerCase();
  if (fromMeta && isKnownLabel(fromMeta)) return fromMeta;
  return "utf-8";
}

export function decodeText(
  bytes: Uint8Array,
  contentType: string | null,
): string {
  const label = detectCharset(contentType, bytes);
  const text = new TextDecoder(label, { fatal: false }).decode(bytes);
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
