import {
  creatorFromSource,
  creatorLabel,
  type CreatorIdentity,
} from "@/lib/creators/identity";

import { heuristicDraftFromText } from "./heuristic";
import { withoutTracking } from "./html";
import type { FetchedPage } from "./net/transport";
import { sourceKeyOf } from "./source-key";
import {
  canonicalPostUrl,
  detectSource,
  isPinterestHost,
  isPinterestShortLink,
  isTikTokHost,
  isTikTokShortLink,
  pinterestPinId,
  recipeLinksIn,
  socialPost,
  type SocialPost,
  type SourceKind,
} from "./sources";
import type { RecipeDraft } from "./types";
import { draftIsUsable, readRecipePage } from "./web";

// One import, whatever its source: find the post, respect its creator,
// spot a copy already in my book, then build the draft (AI when there is a
// key, the structure or the text otherwise). Network, AI and database are
// injected: the job runner passes the real ones, tests pass fakes.

export type ImportDraft = RecipeDraft & { icon: string | null };

export type ExtractInput =
  | {
      kind: "text";
      text: string;
      /** What the text is, for the prompt. */
      hint: "caption" | "description" | "page" | "pasted";
      sourceUrl: string | null;
      sourceAuthor: string | null;
    }
  | { kind: "structured"; draft: RecipeDraft }
  | {
      kind: "images";
      images: Array<{ base64: string; mediaType: string }>;
      note: string | null;
      sourceUrl: string | null;
      sourceAuthor: string | null;
    };

export type CreatorCheck = {
  withdrawn: boolean;
  blocked: boolean;
  official: { slug: string; title: string } | null;
  mine: boolean;
};

export type MyCopy = { slug: string; title: string; saved: boolean };

export type PipelineDeps = {
  fetchPage: (
    url: string,
    options?: { allowHost?: (host: string) => boolean },
  ) => Promise<FetchedPage | null>;
  resolveShortLink: (
    url: string,
    options: {
      allowHost: (host: string) => boolean;
      isResolved: (url: URL) => boolean;
    },
  ) => Promise<string | null>;
  tiktokPost: (post: Extract<SocialPost, { platform: "tiktok" }>) => Promise<{
    url: string;
    handle: string | null;
    caption: string | null;
  } | null>;
  youtubeVideo: (
    post: Extract<SocialPost, { platform: "youtube" }>,
  ) => Promise<{
    title: string | null;
    description: string | null;
    handle: string | null;
  } | null>;
  pinterestOrigin: (pinId: string) => Promise<string | null>;
  /** AI structuring and reformulation; null without a key or on failure. */
  extract: ((input: ExtractInput) => Promise<ImportDraft | null>) | null;
  checkCreator: (
    url: string,
    identity: CreatorIdentity | null,
  ) => Promise<CreatorCheck>;
  findMyCopy: (sourceKey: string) => Promise<MyCopy | null>;
};

export type NeedsInput = {
  kind: "needs_input";
  /** The caption or captures of a post, or the site behind a pin. */
  ask: "caption" | "site_link";
  platform: SourceKind | null;
  sourceUrl: string | null;
  sourceAuthor: string | null;
  title: string | null;
  /** Written recipes a video description links to. */
  links: string[];
};

export type ImportOutcome =
  | { kind: "draft"; draft: ImportDraft; via: "pinterest" | null }
  | NeedsInput
  | {
      kind: "gate";
      code: "withdrawn" | "blocked";
      creator: string | null;
      originalUrl: string;
    }
  | {
      kind: "official";
      creator: string | null;
      recipe: { slug: string; title: string };
    }
  | { kind: "duplicate"; recipe: MyCopy }
  | {
      kind: "failed";
      code:
        | "invalid_url"
        | "not_a_post"
        | "fetch_failed"
        | "not_found"
        | "no_recipe"
        | "needs_ai";
    };

const SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "ow.ly",
  "buff.ly",
  "lnkd.in",
  "urlz.fr",
  "shorturl.at",
  "rebrand.ly",
  "cutt.ly",
]);

const MIN_CAPTION = 40;

function isSocialHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    isTikTokHost(h) ||
    isPinterestHost(h) ||
    /(^|\.)(instagram\.com|instagr\.am|youtube\.com|youtu\.be)$/.test(h)
  );
}

/** A draft never carries the original's own prose unless reformulated. */
function finish(
  draft: ImportDraft,
  sourceUrl: string | null,
  sourceAuthor: string | null,
): ImportDraft {
  return {
    ...draft,
    description: draft.reformulated ? draft.description : null,
    sourceUrl,
    sourceAuthor: sourceAuthor ?? draft.sourceAuthor,
  };
}

/**
 * The creator's wishes first (withdrawn post, refused imports, official
 * version, her own posts always allowed), then my own copy (imported or
 * saved), so a second import opens it instead of making another.
 */
export async function guardPost(
  deps: PipelineDeps,
  sourceUrl: string,
  sourceAuthor: string | null,
): Promise<ImportOutcome | null> {
  const identity = creatorFromSource({ sourceUrl, sourceAuthor });
  const check = await deps.checkCreator(sourceUrl, identity);
  const creator = identity
    ? creatorLabel(identity.platform, identity.handle)
    : null;
  if (!check.mine) {
    if (check.withdrawn) {
      return {
        kind: "gate",
        code: "withdrawn",
        creator,
        originalUrl: sourceUrl,
      };
    }
    if (check.blocked) {
      return { kind: "gate", code: "blocked", creator, originalUrl: sourceUrl };
    }
    if (check.official) {
      return { kind: "official", creator, recipe: check.official };
    }
  }
  const key = sourceKeyOf(sourceUrl);
  const copy = key ? await deps.findMyCopy(key) : null;
  return copy ? { kind: "duplicate", recipe: copy } : null;
}

async function draftFromText(
  deps: PipelineDeps,
  text: string,
  hint: "caption" | "description" | "page" | "pasted",
  sourceUrl: string | null,
  sourceAuthor: string | null,
): Promise<ImportDraft | null> {
  const ai = deps.extract
    ? await deps.extract({ kind: "text", text, hint, sourceUrl, sourceAuthor })
    : null;
  if (ai && draftIsUsable(ai)) return finish(ai, sourceUrl, sourceAuthor);
  const heuristic = heuristicDraftFromText(text, { sourceUrl, sourceAuthor });
  return draftIsUsable(heuristic)
    ? finish({ ...heuristic, icon: null }, sourceUrl, sourceAuthor)
    : null;
}

function captionNeeded(
  platform: SourceKind,
  sourceUrl: string,
  sourceAuthor: string | null,
  title: string | null,
  links: string[] = [],
): NeedsInput {
  return {
    kind: "needs_input",
    ask: "caption",
    platform,
    sourceUrl,
    sourceAuthor,
    title,
    links,
  };
}

const siteLinkNeeded = (sourceUrl: string | null): NeedsInput => ({
  kind: "needs_input",
  ask: "site_link",
  platform: "pinterest",
  sourceUrl,
  sourceAuthor: null,
  title: null,
  links: [],
});

async function fromTikTok(
  deps: PipelineDeps,
  url: string,
): Promise<ImportOutcome> {
  const long = isTikTokShortLink(url)
    ? await deps.resolveShortLink(url, {
        allowHost: isTikTokHost,
        isResolved: (target) => /\/(video|photo)\/\d+/.test(target.pathname),
      })
    : url;
  if (!long) return { kind: "failed", code: "fetch_failed" };
  const post = socialPost(long);
  if (!post || post.platform !== "tiktok")
    return { kind: "failed", code: "not_a_post" };
  const info = await deps.tiktokPost(post);
  const sourceUrl = info?.url ?? canonicalPostUrl(post);
  const handle = info?.handle ?? post.handle;
  const author = handle ? `@${handle}` : null;
  const guarded = await guardPost(deps, sourceUrl, author);
  if (guarded) return guarded;
  const caption = info?.caption ?? null;
  if (!caption || caption.length < MIN_CAPTION) {
    return captionNeeded("tiktok", sourceUrl, author, caption);
  }
  const draft = await draftFromText(
    deps,
    caption,
    "caption",
    sourceUrl,
    author,
  );
  return draft
    ? { kind: "draft", draft, via: null }
    : captionNeeded("tiktok", sourceUrl, author, caption);
}

async function fromYouTube(
  deps: PipelineDeps,
  url: string,
): Promise<ImportOutcome> {
  const post = socialPost(url);
  if (!post || post.platform !== "youtube")
    return { kind: "failed", code: "not_a_post" };
  const sourceUrl = canonicalPostUrl(post);
  const video = await deps.youtubeVideo(post);
  const author = video?.handle ? `@${video.handle}` : null;
  const guarded = await guardPost(deps, sourceUrl, author);
  if (guarded) return guarded;
  const description = video?.description ?? null;
  const links = description ? recipeLinksIn(description) : [];
  const title = video?.title ?? null;
  if (!description || description.length < MIN_CAPTION) {
    return captionNeeded("youtube", sourceUrl, author, title, links);
  }
  const text = title ? `${title}\n${description}` : description;
  const draft = await draftFromText(
    deps,
    text,
    "description",
    sourceUrl,
    author,
  );
  return draft
    ? { kind: "draft", draft, via: null }
    : captionNeeded("youtube", sourceUrl, author, title, links);
}

async function fromInstagram(
  deps: PipelineDeps,
  url: string,
  credit: string | null,
): Promise<ImportOutcome> {
  const post = socialPost(url);
  if (!post || post.platform !== "instagram")
    return { kind: "failed", code: "not_a_post" };
  const sourceUrl = canonicalPostUrl(post);
  const guarded = await guardPost(deps, sourceUrl, credit);
  if (guarded) return guarded;
  // Instagram's oEmbed no longer gives the caption nor the author (since
  // 03/11/2025): the member pastes it or adds captures, with the @.
  return captionNeeded("instagram", sourceUrl, credit, null);
}

async function fromWeb(
  deps: PipelineDeps,
  url: string,
  depth: number,
): Promise<ImportOutcome> {
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  if (SHORTENERS.has(host)) {
    // A short link: where it leads, from its redirects only.
    const target = await deps.resolveShortLink(url, {
      allowHost: () => true,
      isResolved: (candidate) =>
        !SHORTENERS.has(candidate.hostname.toLowerCase().replace(/^www\./, "")),
    });
    return target
      ? importFromUrl(deps, target, null, depth + 1)
      : { kind: "failed", code: "fetch_failed" };
  }

  // Her wishes before we even read the page.
  const given = withoutTracking(url);
  const early = await guardPost(deps, given, null);
  if (early) return early;

  const page = await deps.fetchPage(url, {
    allowHost: (h) => !isSocialHost(h),
  });
  if (!page) return { kind: "failed", code: "fetch_failed" };
  if (!page.ok) {
    return {
      kind: "failed",
      code:
        page.status === 404 || page.status === 410
          ? "not_found"
          : "fetch_failed",
    };
  }
  const read = readRecipePage(page.text, page.url);
  if (sourceKeyOf(read.sourceUrl) !== sourceKeyOf(given)) {
    const guarded = await guardPost(deps, read.sourceUrl, null);
    if (guarded) return guarded;
  }

  if (read.draft) {
    const reformulated = deps.extract
      ? await deps.extract({ kind: "structured", draft: read.draft })
      : null;
    const draft =
      reformulated && draftIsUsable(reformulated)
        ? reformulated
        : { ...read.draft, icon: null };
    return {
      kind: "draft",
      draft: finish(draft, read.sourceUrl, read.draft.sourceAuthor),
      via: null,
    };
  }
  const draft = await draftFromText(
    deps,
    read.text,
    "page",
    read.sourceUrl,
    null,
  );
  return draft
    ? { kind: "draft", draft, via: null }
    : { kind: "failed", code: "no_recipe" };
}

async function fromPinterest(
  deps: PipelineDeps,
  url: string,
  depth: number,
): Promise<ImportOutcome> {
  if (depth > 0) return siteLinkNeeded(null);
  const pinUrl = isPinterestShortLink(url)
    ? await deps.resolveShortLink(url, {
        allowHost: isPinterestHost,
        isResolved: (target) => pinterestPinId(target.href) !== null,
      })
    : url;
  const pinId = pinUrl ? pinterestPinId(pinUrl) : null;
  const origin = pinId ? await deps.pinterestOrigin(pinId) : null;
  const kind = origin ? detectSource(origin) : null;
  if (!origin || !kind || kind === "pinterest") return siteLinkNeeded(null);
  // The recipe comes from the pin's site (or video), credited to it; the
  // pin's image and text are never used.
  const outcome = await importFromUrl(deps, origin, null, depth + 1);
  if (outcome.kind === "draft") return { ...outcome, via: "pinterest" };
  if (outcome.kind === "failed") return siteLinkNeeded(origin);
  return outcome;
}

/** An import from a shared link. `credit` is the @ typed for Instagram. */
export async function importFromUrl(
  deps: PipelineDeps,
  raw: string,
  credit: string | null = null,
  depth = 0,
): Promise<ImportOutcome> {
  if (depth > 2) return { kind: "failed", code: "fetch_failed" };
  const url = raw.trim();
  const kind = detectSource(url);
  switch (kind) {
    case null:
      return { kind: "failed", code: "invalid_url" };
    case "tiktok":
      return fromTikTok(deps, url);
    case "youtube":
      return fromYouTube(deps, url);
    case "instagram":
      return fromInstagram(deps, url, credit);
    case "pinterest":
      return fromPinterest(deps, url, depth);
    case "web":
      return fromWeb(deps, url, depth);
  }
}

/** The canonical address of a source link typed next to a pasted text. */
export function canonicalSource(raw: string | null): string | null {
  if (!raw) return null;
  const kind = detectSource(raw);
  if (!kind || kind === "pinterest") return null;
  if (kind === "web") return withoutTracking(raw.trim());
  const post = socialPost(raw);
  return post ? canonicalPostUrl(post) : null;
}

/** A pasted caption or recipe text, with its source when known. */
export async function importFromText(
  deps: PipelineDeps,
  input: {
    text: string;
    title: string | null;
    sourceUrl: string | null;
    sourceAuthor: string | null;
  },
): Promise<ImportOutcome> {
  const sourceUrl = canonicalSource(input.sourceUrl);
  if (sourceUrl) {
    const guarded = await guardPost(deps, sourceUrl, input.sourceAuthor);
    if (guarded) return guarded;
  }
  const text = input.title ? `${input.title}\n${input.text}` : input.text;
  const draft = await draftFromText(
    deps,
    text,
    "pasted",
    sourceUrl,
    input.sourceAuthor,
  );
  return draft
    ? { kind: "draft", draft, via: null }
    : { kind: "failed", code: "no_recipe" };
}

/** Screenshots of a post or photos of a recipe, read by the AI only. */
export async function importFromImages(
  deps: PipelineDeps,
  input: {
    images: Array<{ base64: string; mediaType: string }>;
    note: string | null;
    sourceUrl: string | null;
    sourceAuthor: string | null;
  },
): Promise<ImportOutcome> {
  if (!deps.extract) return { kind: "failed", code: "needs_ai" };
  const sourceUrl = canonicalSource(input.sourceUrl);
  if (sourceUrl) {
    const guarded = await guardPost(deps, sourceUrl, input.sourceAuthor);
    if (guarded) return guarded;
  }
  const draft = await deps.extract({
    kind: "images",
    images: input.images,
    note: input.note,
    sourceUrl,
    sourceAuthor: input.sourceAuthor,
  });
  return draft && draftIsUsable(draft)
    ? {
        kind: "draft",
        draft: finish(draft, sourceUrl, input.sourceAuthor),
        via: null,
      }
    : { kind: "failed", code: "no_recipe" };
}
