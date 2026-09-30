// Mirror of public.recipe_source_key (migration 202609291500): one key per
// original post whatever the link shape, so a duplicate can be found before
// anything is saved. Same regular expressions and the same case rules (the
// SQL tests are case-insensitive, its extractions are not);
// source-key.cases.json is checked against both implementations.

export function sourceKeyOf(url: string | null): string | null {
  if (!url || !/^https?:\/\/[^/?#]+/i.test(url)) return null;
  let id: string | undefined;
  if (
    /^https?:\/\/([a-z0-9-]+\.)*tiktok\.com\//i.test(url) &&
    /\/video\/[0-9]+/.test(url)
  ) {
    id = /\/video\/([0-9]+)/.exec(url)?.[1];
    return id ? `tiktok:${id}` : null;
  }
  if (
    /^https?:\/\/([a-z0-9-]+\.)*(instagram\.com|instagr\.am)\//i.test(url) &&
    /\/(p|reel|reels|tv)\/[A-Za-z0-9_-]+/.test(url)
  ) {
    id = /\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/.exec(url)?.[1];
    return id ? `instagram:${id}` : null;
  }
  if (
    /^https?:\/\/([a-z0-9-]+\.)*youtube\.com\//i.test(url) &&
    /[?&]v=[A-Za-z0-9_-]+/.test(url)
  ) {
    id = /[?&]v=([A-Za-z0-9_-]+)/.exec(url)?.[1];
    return id ? `youtube:${id}` : null;
  }
  if (
    /^https?:\/\/([a-z0-9-]+\.)*youtube\.com\/(shorts|embed|live)\//i.test(url)
  ) {
    id = /\/(?:shorts|embed|live)\/([A-Za-z0-9_-]+)/.exec(url)?.[1];
    return id ? `youtube:${id}` : null;
  }
  if (/^https?:\/\/youtu\.be\/[A-Za-z0-9_-]+/i.test(url)) {
    id = /youtu\.be\/([A-Za-z0-9_-]+)/.exec(url)?.[1];
    return id ? `youtube:${id}` : null;
  }
  const host = /^https?:\/\/([^/?#:]+)/.exec(url)?.[1];
  if (!host) return null;
  const path = (/^https?:\/\/[^/?#]+(\/[^?#]*)/.exec(url)?.[1] ?? "").replace(
    /\/+$/,
    "",
  );
  return `web:${host.toLowerCase().replace(/^www\./, "")}${path}`;
}
