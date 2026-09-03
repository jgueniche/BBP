import { describe, expect, it } from "vitest";

import { isoDuration, recipeJsonLd, type RecipeForSeo } from "./recipe-jsonld";

const mechouia: RecipeForSeo = {
  slug: "salade-mechouia",
  title: "Salade méchouia",
  description: "Poivrons et tomates grillés, ail, huile d'olive.",
  icon: "🫑",
  kashrut_class: "parve",
  is_fish: false,
  origin: "tunisie",
  category: "entree",
  prep_min: 20,
  cook_min: 75,
  servings: 4,
  source_author: null,
  source_url: null,
  tags: ["salade", "grillé"],
  nutrition_per_serving: { kcal: 119.4, protein_g: 2.31, sodium_mg: 210 },
  created_at: "2026-08-30T10:00:00Z",
  ingredients: [
    { label_raw: "3 poivrons verts", section: null },
    { label_raw: "2 tomates", section: null },
  ],
  steps: [
    { text: "Griller les légumes.", duration_sec: 3600, section: null },
    { text: "Peler, hacher, assaisonner.", duration_sec: null, section: null },
  ],
};

describe("isoDuration", () => {
  it("formats minutes as ISO 8601", () => {
    expect(isoDuration(20)).toBe("PT20M");
    expect(isoDuration(60)).toBe("PT1H");
    expect(isoDuration(75)).toBe("PT1H15M");
    expect(isoDuration(0)).toBeUndefined();
    expect(isoDuration(null)).toBeUndefined();
  });
});

describe("recipeJsonLd", () => {
  it("builds a schema.org Recipe with durations, steps and nutrition", () => {
    const json = recipeJsonLd(mechouia, { siteUrl: "https://bbp.example/" });

    expect(json["@type"]).toBe("Recipe");
    expect(json.url).toBe("https://bbp.example/r/salade-mechouia");
    expect(json.image).toEqual([
      "https://bbp.example/api/og/recette/salade-mechouia",
    ]);
    expect(json.prepTime).toBe("PT20M");
    expect(json.cookTime).toBe("PT1H15M");
    expect(json.totalTime).toBe("PT1H35M");
    expect(json.recipeYield).toBe("4 portions");
    expect(json.recipeIngredient).toEqual(["3 poivrons verts", "2 tomates"]);
    expect(json.recipeInstructions).toEqual([
      { "@type": "HowToStep", position: 1, text: "Griller les légumes." },
      {
        "@type": "HowToStep",
        position: 2,
        text: "Peler, hacher, assaisonner.",
      },
    ]);
    expect(json.nutrition).toEqual({
      "@type": "NutritionInformation",
      calories: "119 kcal",
      proteinContent: "2.3 g",
      sodiumContent: "210 mg",
    });
    expect(json.keywords).toBe("salade, grillé, Parvé, tunisie");
    expect(json.author).toEqual({
      "@type": "Organization",
      name: "Boukha, Boutargue & Protéines",
      url: "https://bbp.example",
    });
  });

  it("credits the original author and omits empty blocks", () => {
    const json = recipeJsonLd(
      {
        ...mechouia,
        source_author: "@tata_cuisine",
        source_url: "https://www.tiktok.com/@tata_cuisine/video/1",
        prep_min: null,
        cook_min: null,
        nutrition_per_serving: {},
        ingredients: [],
        steps: [],
        description: null,
      },
      { siteUrl: "https://bbp.example" },
    );
    expect(json.author).toEqual({ "@type": "Person", name: "@tata_cuisine" });
    expect(json.isBasedOn).toBe("https://www.tiktok.com/@tata_cuisine/video/1");
    expect(json).not.toHaveProperty("prepTime");
    expect(json).not.toHaveProperty("totalTime");
    expect(json).not.toHaveProperty("nutrition");
    expect(json).not.toHaveProperty("recipeIngredient");
    expect(json).not.toHaveProperty("description");
  });
});
