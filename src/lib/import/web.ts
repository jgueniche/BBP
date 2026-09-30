import { canonicalUrl, metaContent, pageText, stripTags } from "./html";
import { extractRecipeJsonLd, jsonLdToDraft } from "./jsonld";
import { microdataToDraft } from "./microdata";
import type { RecipeDraft } from "./types";

/** Enough to cook from: at least two ingredients and one step. */
export function draftIsUsable(draft: RecipeDraft): boolean {
  return draft.ingredients.length >= 2 && draft.steps.length >= 1;
}

export type RecipePage = {
  /** Canonical address on the same site, without tracking parameters. */
  sourceUrl: string;
  /** The structured recipe (JSON-LD, else microdata), when usable. */
  draft: RecipeDraft | null;
  /** Readable text of the page, for the AI when there is no structure. */
  text: string;
  title: string | null;
};

/** What a recipe page offers, most reliable first. */
export function readRecipePage(html: string, pageUrl: string): RecipePage {
  const sourceUrl = canonicalUrl(html, pageUrl);
  const node = extractRecipeJsonLd(html);
  const fromJsonLd = node ? jsonLdToDraft(node, sourceUrl) : null;
  const fromMicrodata =
    fromJsonLd && draftIsUsable(fromJsonLd)
      ? null
      : microdataToDraft(html, sourceUrl);
  const draft = [fromJsonLd, fromMicrodata].find(
    (candidate): candidate is RecipeDraft =>
      candidate !== null && draftIsUsable(candidate),
  );
  const title =
    metaContent(html, "og:title") ??
    stripTags(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
  return {
    sourceUrl,
    draft: draft ?? null,
    text: pageText(html),
    title: title && title.length > 0 ? title : null,
  };
}
