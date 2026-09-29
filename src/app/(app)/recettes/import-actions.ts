"use server";

import { z } from "zod";

import { importRecipeWithAi } from "@/ai/agents/recipe-importer";
import {
  creatorFromSource,
  creatorLabel,
  handleFromUrl,
  type CreatorIdentity,
} from "@/lib/creators/identity";
import { checkImport } from "@/lib/creators/server";
import { detectPlatform } from "@/lib/import/detect";
import { fetchHtml, fetchOembed } from "@/lib/import/fetch";
import { heuristicDraftFromText } from "@/lib/import/heuristic";
import { extractRecipeJsonLd, jsonLdToDraft } from "@/lib/import/jsonld";
import type { RecipeDraft } from "@/lib/import/types";
import { createClient } from "@/lib/supabase/server";

export type ImportDraft = RecipeDraft & { icon: string | null };

export type ImportResult =
  | { ok: true; draft: ImportDraft }
  | {
      ok: false;
      code: "invalid_url" | "fetch_failed" | "no_recipe" | "need_caption";
      /** Prefill for the paste-the-caption flow. */
      sourceAuthor?: string | null;
      title?: string | null;
    }
  | {
      /** The creator withdrew the post or refuses imports: go to her. */
      ok: false;
      code: "withdrawn" | "blocked";
      creator: string | null;
      originalUrl: string;
    }
  | {
      /** She published the official version: save it rather than a copy. */
      ok: false;
      code: "official";
      creator: string | null;
      recipe: { slug: string; title: string };
    };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** The creator's wishes come before any copy (withdrawal, refusal, official). */
async function creatorGate(
  supabase: Supabase,
  url: string,
  identity: CreatorIdentity | null,
): Promise<ImportResult | null> {
  const check = await checkImport(supabase, url, identity);
  const creator = identity
    ? creatorLabel(identity.platform, identity.handle)
    : null;
  if (check.withdrawn) {
    return { ok: false, code: "withdrawn", creator, originalUrl: url };
  }
  if (check.blocked) {
    return { ok: false, code: "blocked", creator, originalUrl: url };
  }
  if (check.official) {
    return { ok: false, code: "official", creator, recipe: check.official };
  }
  return null;
}

function draftIsUsable(draft: RecipeDraft): boolean {
  return draft.ingredients.length >= 2 && draft.steps.length >= 1;
}

/** Crude tag-stripping for pages without JSON-LD, before AI extraction. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(br|\/p|\/li|\/h\d|\/div)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

async function draftFromText(
  text: string,
  sourceUrl: string | null,
  sourceAuthor: string | null,
): Promise<ImportDraft | null> {
  const aiDraft = await importRecipeWithAi({ text, sourceUrl, sourceAuthor });
  if (aiDraft) return aiDraft;
  const heuristic = heuristicDraftFromText(text, { sourceUrl, sourceAuthor });
  return draftIsUsable(heuristic) ? { ...heuristic, icon: null } : null;
}

export async function importRecipeFromUrl(
  rawUrl: string,
): Promise<ImportResult> {
  const { supabase } = await requireUser();
  const url = z.string().max(500).parse(rawUrl).trim();
  const platform = detectPlatform(url);
  if (!platform) return { ok: false, code: "invalid_url" };

  // A TikTok link or a site names its creator; others tell after oEmbed.
  const fromLink = creatorFromSource({ sourceUrl: url, sourceAuthor: null });
  const early = await creatorGate(supabase, url, fromLink);
  if (early) return early;

  if (platform === "web") {
    const html = await fetchHtml(url);
    if (!html) return { ok: false, code: "fetch_failed" };
    const node = extractRecipeJsonLd(html);
    if (node) {
      const draft = jsonLdToDraft(node, url);
      if (draftIsUsable(draft))
        return { ok: true, draft: { ...draft, icon: null } };
    }
    const draft = await draftFromText(
      htmlToText(html).slice(0, 20_000),
      url,
      null,
    );
    return draft ? { ok: true, draft } : { ok: false, code: "no_recipe" };
  }

  // Social platforms: official oEmbed only (brief §9). The credit is the
  // account's @handle when the platform gives its page, else its name.
  const oembed = await fetchOembed(url, platform);
  const handle = oembed?.authorUrl
    ? handleFromUrl(platform, oembed.authorUrl)
    : null;
  const author = handle ? `@${handle}` : (oembed?.authorName ?? null);
  if (handle && !fromLink) {
    const gate = await creatorGate(
      supabase,
      url,
      creatorFromSource({ sourceUrl: url, sourceAuthor: author }),
    );
    if (gate) return gate;
  }
  const caption = oembed?.title ?? null;
  if (!caption || caption.length < 40) {
    // No usable caption via oEmbed (YouTube returns only the video title,
    // Instagram needs a token) — ask the user to paste the description.
    return {
      ok: false,
      code: "need_caption",
      sourceAuthor: author,
      title: caption,
    };
  }
  const draft = await draftFromText(caption, url, author);
  return draft
    ? { ok: true, draft }
    : { ok: false, code: "need_caption", sourceAuthor: author, title: caption };
}

const textImportSchema = z.object({
  text: z.string().min(20).max(20_000),
  sourceUrl: z.string().max(500).nullable(),
  sourceAuthor: z.string().max(120).nullable(),
  title: z.string().max(120).nullable(),
});

export async function importRecipeFromText(
  raw: z.infer<typeof textImportSchema>,
): Promise<ImportResult> {
  const { supabase } = await requireUser();
  const input = textImportSchema.parse(raw);
  const sourceUrl =
    input.sourceUrl && detectPlatform(input.sourceUrl) ? input.sourceUrl : null;
  if (sourceUrl) {
    const gate = await creatorGate(
      supabase,
      sourceUrl,
      creatorFromSource({ sourceUrl, sourceAuthor: input.sourceAuthor }),
    );
    if (gate) return gate;
  }
  const draft = await draftFromText(
    input.title ? `${input.title}\n${input.text}` : input.text,
    sourceUrl,
    input.sourceAuthor,
  );
  return draft ? { ok: true, draft } : { ok: false, code: "no_recipe" };
}

const photoImportSchema = z.object({
  imageBase64: z.string().min(100).max(8_000_000),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export async function importRecipeFromPhoto(
  raw: z.infer<typeof photoImportSchema>,
): Promise<ImportResult> {
  await requireUser();
  const input = photoImportSchema.parse(raw);
  const draft = await importRecipeWithAi({
    text: "",
    sourceUrl: null,
    sourceAuthor: null,
    imageBase64: input.imageBase64,
    imageMediaType: input.mediaType,
  });
  return draft ? { ok: true, draft } : { ok: false, code: "no_recipe" };
}
