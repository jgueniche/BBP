import "server-only";

import { z } from "zod";

import { handleFromUrl } from "@/lib/creators/identity";

import { fetchJson } from "./fetch";
import { canonicalPostUrl, isPinterestHost, type SocialPost } from "./sources";

// The official, public endpoints of each platform. Never a page of TikTok,
// Instagram or Pinterest, never a video, never an image: TikTok's developer
// terms forbid building a content base, so nothing here is stored.

const tiktokOembedSchema = z.object({
  title: z.string().nullish(),
  author_name: z.string().nullish(),
  author_url: z.string().nullish(),
  author_unique_id: z.string().nullish(),
  embed_product_id: z.string().nullish(),
});

export type TikTokPost = {
  /** Canonical address with the creator's @ (from TikTok's answer). */
  url: string;
  handle: string | null;
  caption: string | null;
};

/** TikTok's oEmbed: the caption and the account, nothing else is kept. */
export async function tiktokPost(
  post: Extract<SocialPost, { platform: "tiktok" }>,
): Promise<TikTokPost | null> {
  const asked = canonicalPostUrl(post);
  const data = await fetchJson(
    `https://www.tiktok.com/oembed?url=${encodeURIComponent(asked)}`,
  );
  const parsed = tiktokOembedSchema.safeParse(data);
  if (!parsed.success) return null;
  const handle =
    (parsed.data.author_unique_id &&
    /^[A-Za-z0-9._]{2,24}$/.test(parsed.data.author_unique_id)
      ? parsed.data.author_unique_id.toLowerCase()
      : null) ??
    (parsed.data.author_url
      ? handleFromUrl("tiktok", parsed.data.author_url)
      : null) ??
    post.handle;
  const id =
    parsed.data.embed_product_id &&
    /^\d{6,25}$/.test(parsed.data.embed_product_id)
      ? parsed.data.embed_product_id
      : post.id;
  return {
    url: canonicalPostUrl({ ...post, id, handle }),
    handle,
    caption: parsed.data.title?.trim() || null,
  };
}

const youtubeOembedSchema = z.object({
  title: z.string().nullish(),
  author_url: z.string().nullish(),
});

const youtubeVideoSchema = z.object({
  items: z
    .array(
      z.object({
        snippet: z.object({
          title: z.string().nullish(),
          description: z.string().nullish(),
          channelId: z.string().nullish(),
        }),
      }),
    )
    .default([]),
});

const youtubeChannelSchema = z.object({
  items: z
    .array(z.object({ snippet: z.object({ customUrl: z.string().nullish() }) }))
    .default([]),
});

export type YouTubeVideo = {
  title: string | null;
  /** From the Data API only (YOUTUBE_API_KEY): oEmbed has no description. */
  description: string | null;
  handle: string | null;
};

/**
 * YouTube's oEmbed (title, channel) and, with a key, the Data API v3
 * (description: 1 unit, the channel's @ when oEmbed lacks it: 1 more).
 */
export async function youtubeVideo(
  post: Extract<SocialPost, { platform: "youtube" }>,
): Promise<YouTubeVideo | null> {
  const url = canonicalPostUrl(post);
  const key = process.env.YOUTUBE_API_KEY?.trim() || null;
  const [oembedData, videoData] = await Promise.all([
    fetchJson(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
    ),
    key
      ? fetchJson(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&hl=fr&id=${encodeURIComponent(post.id)}&key=${encodeURIComponent(key)}`,
        )
      : Promise.resolve(null),
  ]);
  const oembed = youtubeOembedSchema.safeParse(oembedData);
  const video = youtubeVideoSchema.safeParse(videoData);
  const snippet = video.success ? video.data.items[0]?.snippet : undefined;
  if (!oembed.success && !snippet) return null;

  let handle =
    oembed.success && oembed.data.author_url
      ? handleFromUrl("youtube", oembed.data.author_url)
      : null;
  if (!handle && key && snippet?.channelId) {
    const channel = youtubeChannelSchema.safeParse(
      await fetchJson(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(snippet.channelId)}&key=${encodeURIComponent(key)}`,
      ),
    );
    const custom = channel.success
      ? channel.data.items[0]?.snippet.customUrl
      : null;
    handle = custom
      ? handleFromUrl("youtube", `https://www.youtube.com/${custom}`)
      : null;
  }
  return {
    title:
      snippet?.title?.trim() ||
      (oembed.success ? oembed.data.title?.trim() || null : null),
    description: snippet?.description?.trim() || null,
    handle,
  };
}

const pinInfoSchema = z.object({
  data: z
    .array(
      z.object({
        link: z.string().nullish(),
        rich_metadata: z.object({ url: z.string().nullish() }).nullish(),
      }),
    )
    .default([]),
});

/**
 * Where a pin leads: the link Pinterest's embed service gives for it (the
 * pin's image and text are never read nor kept). Null when the pin has no
 * outside link.
 */
export async function pinterestOrigin(pinId: string): Promise<string | null> {
  const data = await fetchJson(
    `https://widgets.pinterest.com/v3/pidgets/pins/info/?pin_ids=${encodeURIComponent(pinId)}`,
  );
  const parsed = pinInfoSchema.safeParse(data);
  if (!parsed.success) return null;
  const pin = parsed.data.data[0];
  for (const candidate of [pin?.link, pin?.rich_metadata?.url]) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (
        (url.protocol === "https:" || url.protocol === "http:") &&
        !isPinterestHost(url.hostname)
      ) {
        return url.href;
      }
    } catch {
      // not an address
    }
  }
  return null;
}
