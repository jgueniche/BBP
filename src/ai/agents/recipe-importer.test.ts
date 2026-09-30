// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PROMPT_VERSION,
  imagesPrompt,
  structuredPrompt,
  textPrompt,
} from "@/ai/prompts/recipe-importer";
import { copiedPassages } from "@/lib/import/reformulation";
import type { RecipeDraft } from "@/lib/import/types";

vi.mock("server-only", () => ({}));
vi.mock("@/ai/provider", () => ({
  pickModel: () => ({ model: "fake-model", modelId: "fake-model" }),
}));
const generateObject = vi.fn();
vi.mock("ai", () => ({
  generateObject: (options: unknown) => generateObject(options),
}));

const { extractRecipe } = await import("./recipe-importer");

const CAPTION =
  "Mon gratin préféré. Épluche les pommes de terre et coupe-les en rondelles très fines avec une mandoline. Verse la crème chaude par-dessus et enfourne une heure.";

function answer(
  steps: string[],
  description: string | null = "Un gratin fondant.",
) {
  return {
    object: {
      is_recipe: true,
      title: "Gratin",
      description,
      servings: 4,
      prep_min: 15,
      cook_min: 60,
      icon: "🥔",
      tags: ["gratin"],
      category: "accompagnement",
      cuisine: "france",
      ingredients: [
        { label: "pommes de terre", grams: 800, section: null },
        { label: "crème", grams: 400, section: null },
      ],
      steps: steps.map((text) => ({ text, duration_min: null, section: null })),
    },
  };
}

describe("copiedPassages", () => {
  it("finds runs of 8 words, whatever the accents and punctuation", () => {
    expect(
      copiedPassages(CAPTION, [
        "Epluche les pommes de terre, et coupe-les en rondelles tres fines.",
        "Tranche finement les pommes de terre pelées.",
      ]),
    ).toEqual([
      "Epluche les pommes de terre, et coupe-les en rondelles tres fines.",
    ]);
    expect(copiedPassages("court", ["court aussi"])).toEqual([]);
  });
});

describe("importer prompt", () => {
  it("is versioned and speaks French", () => {
    expect(PROMPT_VERSION).toBe("2.0.0");
    expect(textPrompt("caption", "abc")).toContain(
      "la légende d'une publication",
    );
    expect(imagesPrompt(3, "@maya")).toContain("3 captures");
    expect(
      structuredPrompt({
        title: "Gratin",
        description: null,
        ingredients: ["crème (400 g)"],
        steps: ["Verse la crème."],
      }),
    ).toContain("1. Verse la crème.");
  });
});

describe("extractRecipe", () => {
  beforeEach(() => generateObject.mockReset());

  it("asks for one rewrite when the answer repeats the source", async () => {
    generateObject
      .mockResolvedValueOnce(
        answer([
          "Épluche les pommes de terre et coupe-les en rondelles très fines avec une mandoline.",
        ]),
      )
      .mockResolvedValueOnce(
        answer(["Pèle les pommes de terre, puis tranche-les finement."]),
      );
    const draft = await extractRecipe({
      kind: "text",
      hint: "caption",
      text: CAPTION,
      sourceUrl: "https://www.tiktok.com/@maya/video/7312345678901234567",
      sourceAuthor: "@maya",
    });
    expect(generateObject).toHaveBeenCalledTimes(2);
    const retry = generateObject.mock.calls[1]![0] as {
      messages: Array<{ role: string; content: unknown }>;
    };
    expect(retry.messages.at(-1)?.content).toMatch(/mot pour mot/);
    expect(draft).toMatchObject({
      reformulated: true,
      method: "ai",
      category: "accompagnement",
      sourceAuthor: "@maya",
      steps: [{ text: "Pèle les pommes de terre, puis tranche-les finement." }],
    });
  });

  it("flags a card that still repeats the source", async () => {
    const copied = answer([
      "Épluche les pommes de terre et coupe-les en rondelles très fines avec une mandoline.",
    ]);
    generateObject.mockResolvedValue(copied);
    const draft = await extractRecipe({
      kind: "text",
      hint: "caption",
      text: CAPTION,
      sourceUrl: null,
      sourceAuthor: null,
    });
    expect(draft?.reformulated).toBe(false);
  });

  it("keeps a site's ingredients and rewrites its steps", async () => {
    generateObject.mockResolvedValueOnce(
      answer(["Tranche les pommes de terre."], null),
    );
    const structured: RecipeDraft = {
      title: "Gratin dauphinois",
      description: "Le texte du site.",
      servings: 6,
      prepMin: 20,
      cookMin: null,
      tags: [],
      category: null,
      cuisine: null,
      ingredients: [
        { label: "pommes de terre", grams: 1000, section: null },
        { label: "crème", grams: 500, section: null },
        { label: "1 gousse d'ail", grams: null, section: null },
      ],
      steps: [
        {
          text: "Coupez les pommes de terre en rondelles fines.",
          durationMin: null,
          section: null,
        },
      ],
      sourceUrl: "https://www.marmiton.org/recettes/recette_gratin_1.aspx",
      sourceAuthor: null,
      method: "structured",
      reformulated: false,
    };
    const draft = await extractRecipe({
      kind: "structured",
      draft: structured,
    });
    expect(draft).toMatchObject({
      title: "Gratin",
      servings: 6,
      prepMin: 20,
      cookMin: 60,
      category: "accompagnement",
      reformulated: true,
      sourceUrl: "https://www.marmiton.org/recettes/recette_gratin_1.aspx",
      steps: [{ text: "Tranche les pommes de terre." }],
    });
    expect(draft?.ingredients).toEqual(structured.ingredients);
  });

  it("sends every capture, in order", async () => {
    generateObject.mockResolvedValueOnce(
      answer(["Tranche les pommes de terre."]),
    );
    await extractRecipe({
      kind: "images",
      images: [
        { base64: "AAA", mediaType: "image/jpeg" },
        { base64: "BBB", mediaType: "image/jpeg" },
      ],
      note: null,
      sourceUrl: null,
      sourceAuthor: null,
    });
    const call = generateObject.mock.calls[0]![0] as {
      messages: Array<{ content: Array<{ type: string; image?: string }> }>;
    };
    expect(
      call.messages[0]!.content.map((part) => part.image ?? part.type),
    ).toEqual(["AAA", "BBB", "text"]);
  });

  it("gives up quietly on something that is not a recipe", async () => {
    generateObject.mockResolvedValueOnce({
      object: { ...answer([]).object, is_recipe: false },
    });
    expect(
      await extractRecipe({
        kind: "text",
        hint: "pasted",
        text: "Bonjour",
        sourceUrl: null,
        sourceAuthor: null,
      }),
    ).toBeNull();
  });
});
