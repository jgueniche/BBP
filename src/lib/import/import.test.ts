import { describe, expect, it } from "vitest";

import { detectPlatform } from "./detect";
import { heuristicDraftFromText } from "./heuristic";
import { parseIngredientLine } from "./ingredients";
import {
  extractRecipeJsonLd,
  jsonLdToDraft,
  parseIsoDurationToMin,
} from "./jsonld";

describe("detectPlatform", () => {
  it("classifies social platforms", () => {
    expect(detectPlatform("https://www.instagram.com/p/abc123/")).toBe(
      "instagram",
    );
    expect(detectPlatform("https://vm.tiktok.com/ZM123/")).toBe("tiktok");
    expect(detectPlatform("https://www.tiktok.com/@chef/video/1")).toBe(
      "tiktok",
    );
    expect(detectPlatform("https://youtu.be/xyz")).toBe("youtube");
    expect(detectPlatform("https://www.marmiton.org/recettes/x.aspx")).toBe(
      "web",
    );
  });

  it("rejects unsafe or invalid URLs", () => {
    expect(detectPlatform("not a url")).toBeNull();
    expect(detectPlatform("ftp://example.com/x")).toBeNull();
    expect(detectPlatform("http://localhost:3000/admin")).toBeNull();
    expect(detectPlatform("http://127.0.0.1/x")).toBeNull();
    expect(detectPlatform("http://192.168.1.10/x")).toBeNull();
    expect(detectPlatform("http://10.0.0.1/x")).toBeNull();
    expect(detectPlatform("http://172.16.0.1/x")).toBeNull();
    expect(detectPlatform("http://internal/x")).toBeNull();
  });
});

describe("parseIngredientLine", () => {
  it("converts metric units to grams", () => {
    expect(parseIngredientLine("200 g de semoule fine")).toEqual({
      label: "semoule fine",
      grams: 200,
      section: null,
    });
    expect(parseIngredientLine("1 kg d'agneau")).toMatchObject({
      label: "agneau",
      grams: 1000,
    });
    expect(parseIngredientLine("10 cl d'huile d'olive")).toMatchObject({
      label: "huile d'olive",
      grams: 100,
    });
    expect(parseIngredientLine("25 cl de lait")).toMatchObject({
      grams: 250,
    });
  });

  it("converts French spoons", () => {
    expect(parseIngredientLine("2 c. à soupe d'huile")).toMatchObject({
      label: "huile",
      grams: 30,
    });
    expect(parseIngredientLine("1 càc de cumin")).toMatchObject({
      label: "cumin",
      grams: 5,
    });
  });

  it("keeps countable items intact", () => {
    expect(parseIngredientLine("3 œufs")).toEqual({
      label: "3 œufs",
      grams: null,
      section: null,
    });
    expect(parseIngredientLine("- 2 oignons émincés")).toMatchObject({
      label: "2 oignons émincés",
      grams: null,
    });
    expect(parseIngredientLine("½ botte de coriandre")).toMatchObject({
      grams: null,
    });
  });

  it("handles decimal commas and fractions", () => {
    expect(parseIngredientLine("62,5 g de beurre")).toMatchObject({
      grams: 62.5,
    });
    expect(parseIngredientLine("1/2 l de bouillon")).toMatchObject({
      grams: 500,
    });
  });
});

describe("parseIsoDurationToMin", () => {
  it("parses ISO 8601 durations", () => {
    expect(parseIsoDurationToMin("PT20M")).toBe(20);
    expect(parseIsoDurationToMin("PT1H30M")).toBe(90);
    expect(parseIsoDurationToMin("PT2H")).toBe(120);
    expect(parseIsoDurationToMin("P0DT45M")).toBe(45);
  });

  it("rejects junk", () => {
    expect(parseIsoDurationToMin("tomorrow")).toBeNull();
    expect(parseIsoDurationToMin(null)).toBeNull();
    expect(parseIsoDurationToMin("PT0M")).toBeNull();
  });
});

const SAMPLE_HTML = `
<html><head>
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
 {"@type":"WebSite","name":"Site"},
 {"@type":"Recipe","name":"Couscous au poulet",
  "description":"Un couscous du vendredi.",
  "author":{"@type":"Person","name":"Sarah Cohen"},
  "recipeYield":"6 personnes",
  "prepTime":"PT30M","cookTime":"PT1H15M",
  "keywords":"couscous, vendredi, familial",
  "recipeIngredient":["500 g de semoule moyenne","1 kg de poulet","2 c. à soupe d'huile d'olive","3 carottes"],
  "recipeInstructions":[
    {"@type":"HowToSection","name":"Le bouillon","itemListElement":[
      {"@type":"HowToStep","text":"Faire revenir le poulet dans l'huile."},
      {"@type":"HowToStep","text":"Couvrir d'eau et laisser mijoter.","totalTime":"PT45M"}
    ]},
    {"@type":"HowToStep","text":"Cuire la semoule à la vapeur."}
  ]}
]}
</script></head><body></body></html>`;

describe("extractRecipeJsonLd + jsonLdToDraft", () => {
  it("finds the Recipe node inside @graph and maps it", () => {
    const node = extractRecipeJsonLd(SAMPLE_HTML);
    expect(node).not.toBeNull();
    const draft = jsonLdToDraft(node!, "https://example.com/couscous");
    expect(draft.title).toBe("Couscous au poulet");
    expect(draft.sourceAuthor).toBe("Sarah Cohen");
    expect(draft.servings).toBe(6);
    expect(draft.prepMin).toBe(30);
    expect(draft.cookMin).toBe(75);
    expect(draft.tags).toContain("couscous");
    expect(draft.ingredients).toHaveLength(4);
    expect(draft.ingredients[0]).toMatchObject({
      label: "semoule moyenne",
      grams: 500,
    });
    expect(draft.steps).toHaveLength(3);
    expect(draft.steps[0].section).toBe("Le bouillon");
    expect(draft.steps[1].durationMin).toBe(45);
    expect(draft.steps[2].section).toBeNull();
    expect(draft.method).toBe("structured");
  });

  it("returns null when no recipe is present", () => {
    expect(extractRecipeJsonLd("<html><body>rien</body></html>")).toBeNull();
    expect(
      extractRecipeJsonLd(
        '<script type="application/ld+json">{invalid</script>',
      ),
    ).toBeNull();
  });
});

describe("heuristicDraftFromText", () => {
  const CAPTION = `Chakchouka de ma grand-mère 🍅
La recette parfaite pour le dimanche soir !
Pour 4 personnes
Ingrédients :
- 4 tomates bien mûres
- 2 poivrons rouges
- 200 g de passata
- 4 œufs
- 1 càc de cumin
Préparation :
1. Faire revenir les poivrons coupés en lanières.
2. Ajouter les tomates et la passata, laisser compoter 20 minutes.
3. Casser les œufs et couvrir 5 minutes.
Cuisson : 30 min
#chakchouka #tunisie #recettefacile`;

  it("splits a social caption into a usable draft", () => {
    const draft = heuristicDraftFromText(CAPTION);
    expect(draft.title).toBe("Chakchouka de ma grand-mère 🍅");
    expect(draft.servings).toBe(4);
    expect(draft.cookMin).toBe(30);
    expect(draft.ingredients).toHaveLength(5);
    expect(draft.ingredients[2]).toMatchObject({
      label: "passata",
      grams: 200,
    });
    expect(draft.steps).toHaveLength(3);
    expect(draft.steps[0].text).toMatch(/poivrons/);
    expect(draft.tags).toEqual(["chakchouka", "tunisie", "recettefacile"]);
    expect(draft.method).toBe("heuristic");
  });

  it("keeps provided source credit", () => {
    const draft = heuristicDraftFromText("Salade rapide\n- 1 concombre", {
      sourceUrl: "https://www.instagram.com/p/x/",
      sourceAuthor: "@mamie_cuisine",
    });
    expect(draft.sourceUrl).toBe("https://www.instagram.com/p/x/");
    expect(draft.sourceAuthor).toBe("@mamie_cuisine");
  });
});
