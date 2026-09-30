"use server";

import { z } from "zod";

import { extractRecipe } from "@/ai/agents/recipe-importer";
import { pickModel } from "@/ai/provider";
import {
  importFromImages,
  importFromText,
  importFromUrl,
  type ImportDraft,
  type ImportOutcome,
  type MyCopy,
} from "@/lib/import/pipeline";
import { pipelineDeps } from "@/lib/import/server";
import { createClient } from "@/lib/supabase/server";

export type { ImportDraft };

export type ImportResult =
  | { ok: true; draft: ImportDraft; via: "pinterest" | null }
  | {
      ok: false;
      code:
        | "invalid_url"
        | "not_a_post"
        | "fetch_failed"
        | "not_found"
        | "no_recipe"
        | "needs_ai"
        | "need_site_link";
    }
  | {
      /** Paste the caption (or add captures): prefilled with what we know. */
      ok: false;
      code: "need_caption";
      sourceUrl: string | null;
      sourceAuthor: string | null;
      title: string | null;
      links: string[];
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
    }
  | {
      /** Already in my book: open my copy rather than make another. */
      ok: false;
      code: "duplicate";
      recipe: MyCopy;
    };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

async function deps() {
  const { supabase, user } = await requireUser();
  return pipelineDeps(
    supabase,
    user.id,
    pickModel("chat") ? extractRecipe : null,
  );
}

function toResult(outcome: ImportOutcome): ImportResult {
  switch (outcome.kind) {
    case "draft":
      return { ok: true, draft: outcome.draft, via: outcome.via };
    case "needs_input":
      return outcome.ask === "site_link"
        ? { ok: false, code: "need_site_link" }
        : {
            ok: false,
            code: "need_caption",
            sourceUrl: outcome.sourceUrl,
            sourceAuthor: outcome.sourceAuthor,
            title: outcome.title,
            links: outcome.links,
          };
    case "gate":
      return {
        ok: false,
        code: outcome.code,
        creator: outcome.creator,
        originalUrl: outcome.originalUrl,
      };
    case "official":
      return {
        ok: false,
        code: "official",
        creator: outcome.creator,
        recipe: outcome.recipe,
      };
    case "duplicate":
      return { ok: false, code: "duplicate", recipe: outcome.recipe };
    case "failed":
      return { ok: false, code: outcome.code };
  }
}

export async function importRecipeFromUrl(
  rawUrl: string,
): Promise<ImportResult> {
  const url = z.string().max(500).parse(rawUrl).trim();
  return toResult(await importFromUrl(await deps(), url));
}

const textImportSchema = z.object({
  text: z.string().min(20).max(20_000),
  sourceUrl: z.string().max(500).nullable(),
  sourceAuthor: z.string().max(120).nullable(),
  title: z.string().max(200).nullable(),
});

export async function importRecipeFromText(
  raw: z.infer<typeof textImportSchema>,
): Promise<ImportResult> {
  const input = textImportSchema.parse(raw);
  return toResult(await importFromText(await deps(), input));
}

const photoImportSchema = z.object({
  imageBase64: z.string().min(100).max(8_000_000),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export async function importRecipeFromPhoto(
  raw: z.infer<typeof photoImportSchema>,
): Promise<ImportResult> {
  const input = photoImportSchema.parse(raw);
  return toResult(
    await importFromImages(await deps(), {
      images: [{ base64: input.imageBase64, mediaType: input.mediaType }],
      note: null,
      sourceUrl: null,
      sourceAuthor: null,
    }),
  );
}
