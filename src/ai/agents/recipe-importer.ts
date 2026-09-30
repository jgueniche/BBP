import "server-only";

import { generateObject, type ModelMessage } from "ai";
import { z } from "zod";

import {
  RECIPE_IMPORTER_SYSTEM,
  imagesPrompt,
  rewriteFeedback,
  structuredPrompt,
  textPrompt,
} from "@/ai/prompts/recipe-importer";
import { pickModel } from "@/ai/provider";
import type { ExtractInput, ImportDraft } from "@/lib/import/pipeline";
import { copiedPassages } from "@/lib/import/reformulation";
import type { RecipeDraft } from "@/lib/import/types";
import { CATEGORIES, CUISINES } from "@/lib/recipes/cuisines";

const importedRecipeSchema = z.object({
  is_recipe: z.boolean(),
  title: z.string().max(120),
  description: z.string().max(300).nullable(),
  servings: z.number().int().min(1).max(24).nullable(),
  prep_min: z.number().int().min(0).max(600).nullable(),
  cook_min: z.number().int().min(0).max(1440).nullable(),
  icon: z.string().max(8).nullable(),
  tags: z.array(z.string().max(30)).max(8),
  category: z.enum(CATEGORIES).nullable(),
  cuisine: z.enum(CUISINES).nullable(),
  ingredients: z
    .array(
      z.object({
        label: z.string().max(120),
        grams: z.number().positive().max(20000).nullable(),
        section: z.string().max(60).nullable(),
      }),
    )
    .max(30),
  steps: z
    .array(
      z.object({
        text: z.string().max(600),
        duration_min: z.number().int().min(1).max(720).nullable(),
        section: z.string().max(60).nullable(),
      }),
    )
    .max(25),
});

type ImportedRecipe = z.infer<typeof importedRecipeSchema>;

const FIRST_TRY_MS = 40_000;
const RETRY_MS = 25_000;
/** A rewrite is asked only while the job still has time for it. */
const RETRY_BEFORE_MS = 30_000;

function ingredientLine(
  ingredient: RecipeDraft["ingredients"][number],
): string {
  const amount = ingredient.grams !== null ? ` (${ingredient.grams} g)` : "";
  const section = ingredient.section ? `[${ingredient.section}] ` : "";
  return `${section}${ingredient.label}${amount}`;
}

function firstMessage(input: ExtractInput): ModelMessage {
  if (input.kind === "text") {
    return {
      role: "user",
      content: textPrompt(input.hint, input.text.slice(0, 20_000)),
    };
  }
  if (input.kind === "structured") {
    return {
      role: "user",
      content: structuredPrompt({
        title: input.draft.title,
        description: input.draft.description,
        ingredients: input.draft.ingredients.map(ingredientLine),
        steps: input.draft.steps.map((step) => step.text),
      }),
    };
  }
  return {
    role: "user",
    content: [
      ...input.images.map((image) => ({
        type: "image" as const,
        image: image.base64,
        mediaType: image.mediaType,
      })),
      {
        type: "text" as const,
        text: imagesPrompt(input.images.length, input.note),
      },
    ],
  };
}

/** What the card must not repeat word for word (unknown for images). */
function sourceText(input: ExtractInput): string | null {
  if (input.kind === "text") return input.text;
  if (input.kind === "structured") {
    return [
      input.draft.title,
      input.draft.description ?? "",
      ...input.draft.steps.map((step) => step.text),
    ].join("\n");
  }
  return null;
}

function writtenTexts(recipe: ImportedRecipe): string[] {
  return [recipe.description ?? "", ...recipe.steps.map((step) => step.text)];
}

function toDraft(
  recipe: ImportedRecipe,
  input: ExtractInput,
  reformulated: boolean,
): ImportDraft {
  const steps = recipe.steps.map((step) => ({
    text: step.text,
    durationMin: step.duration_min,
    section: step.section,
  }));
  const tags = recipe.tags.map((tag) => tag.toLowerCase().replace(/^#/, ""));
  if (input.kind === "structured") {
    // The site's ingredients and quantities are facts: kept as parsed.
    const base = input.draft;
    return {
      ...base,
      title: recipe.title.trim() || base.title,
      description: recipe.description,
      servings: base.servings ?? recipe.servings,
      prepMin: base.prepMin ?? recipe.prep_min,
      cookMin: base.cookMin ?? recipe.cook_min,
      tags: tags.length > 0 ? tags : base.tags,
      category: base.category ?? recipe.category,
      cuisine: base.cuisine ?? recipe.cuisine,
      steps: steps.length > 0 ? steps : base.steps,
      method: "ai",
      reformulated,
      icon: recipe.icon,
    };
  }
  return {
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    prepMin: recipe.prep_min,
    cookMin: recipe.cook_min,
    tags,
    category: recipe.category,
    cuisine: recipe.cuisine,
    ingredients: recipe.ingredients.map((ingredient) => ({
      label: ingredient.label,
      grams: ingredient.grams,
      section: ingredient.section,
    })),
    steps,
    sourceUrl: input.sourceUrl,
    sourceAuthor: input.sourceAuthor,
    method: "ai",
    reformulated,
    icon: recipe.icon,
  };
}

/**
 * The AI's card for an import (prompt 2.0.0): structured, reformulated,
 * in French. The copied-passage check runs whenever the source text is
 * known; one rewrite is asked if needed. Null without a model key, on
 * failure, or when the source is not a recipe: the caller falls back on the
 * site's structure or the heuristic.
 */
export async function extractRecipe(
  input: ExtractInput,
): Promise<ImportDraft | null> {
  const picked = pickModel("chat");
  if (!picked) return null;
  const started = Date.now();
  const messages: ModelMessage[] = [firstMessage(input)];
  try {
    let { object } = await generateObject({
      model: picked.model,
      schema: importedRecipeSchema,
      system: RECIPE_IMPORTER_SYSTEM,
      messages,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(FIRST_TRY_MS),
    });
    if (!object.is_recipe || object.ingredients.length === 0) return null;

    const source = sourceText(input);
    let copied = source ? copiedPassages(source, writtenTexts(object)) : [];
    if (copied.length > 0 && Date.now() - started < RETRY_BEFORE_MS) {
      const retry = await generateObject({
        model: picked.model,
        schema: importedRecipeSchema,
        system: RECIPE_IMPORTER_SYSTEM,
        messages: [
          ...messages,
          { role: "assistant", content: JSON.stringify(object) },
          { role: "user", content: rewriteFeedback(copied.slice(0, 6)) },
        ],
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(RETRY_MS),
      }).catch(() => null);
      if (retry?.object.is_recipe && retry.object.ingredients.length > 0) {
        object = retry.object;
        copied = copiedPassages(source ?? "", writtenTexts(object));
      }
    }
    return toDraft(object, input, copied.length === 0);
  } catch (error) {
    console.error("recipe import extraction failed", error);
    return null;
  }
}
