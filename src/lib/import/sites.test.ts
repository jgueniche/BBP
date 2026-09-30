import { describe, expect, it } from "vitest";

import {
  canonicalUrl,
  decodeEntities,
  pageText,
  registrableDomain,
  withoutTracking,
} from "./html";
import {
  parseIngredientLine,
  parseIngredientList,
  sectionHeader,
} from "./ingredients";
import { cleanRecipeTitle, servingsFromYield } from "./jsonld";
import { categoryFrom, cuisineFrom } from "./taxonomy";
import { readRecipePage } from "./web";

// Page shapes observed on French recipe sites (30/09/2026). The recipe
// texts are ours; only the structure mirrors each site.

const ld = (value: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(value)}</script>`;

const MARMITON_LIKE = `<!doctype html><html><head>
<link rel="canonical" href="https://www.marmiton.org/recettes/recette_crepes-du-dimanche_1234.aspx">
${ld([
  {
    "@context": "http://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [],
  },
  {
    "@context": "http://schema.org",
    "@type": "Recipe",
    name: "Crêpes du dimanche : la meilleure recette",
    description:
      "Recette Crêpes du dimanche : une pâte souple qui repose une heure.",
    recipeYield: "15 crêpes",
    prepTime: "PT10M",
    cookTime: "PT20M",
    totalTime: "PT30M",
    recipeIngredient: [
      "250 g de farine",
      "4 oeufs",
      "2 cuillères à soupe de sucre",
      "50 cl de lait",
      "1 pincée de sel",
    ],
    recipeInstructions: [
      {
        "@type": "HowToStep",
        text: "Verse la farine et le sel dans un grand bol.",
      },
      {
        "@type": "HowToStep",
        text: "Ajoute les oeufs puis le lait petit à petit.",
      },
      {
        "@type": "HowToStep",
        text: "Laisse reposer, puis fais cuire à la poêle.",
      },
    ],
    keywords: "crêpes, dessert, chandeleur",
    author: { "@type": "Person", name: "Anonyme" },
    recipeCategory: "Dessert",
  },
])}
</head><body><nav>Menu</nav><main><h1>Crêpes</h1></main></body></html>`;

const SEVEN_FIFTY_LIKE = `<html><head>${ld({
  "@context": "http://schema.org",
  "@type": "Recipe",
  name: "Tartelettes aux poires",
  recipeYield: "4 personnes",
  prepTime: "PT25M",
  totalTime: "PT25M",
  recipeIngredient: [
    "1 pâte feuilletée",
    "3 poires",
    "Quelques gouttes d'extrait de vanille",
    "30 g de sucre roux",
  ],
  recipeInstructions: [
    {
      "@type": "HowToStep",
      text: "Découpe la pâte en quatre carrés.",
      url: "https://www.750g.com/x.htm#step1",
    },
    {
      "@type": "HowToStep",
      text: "Pose les poires en lamelles et saupoudre de sucre.",
      url: "https://www.750g.com/x.htm#step2",
    },
  ],
  author: {
    "@context": "http://schema.org",
    "@type": "Person",
    name: "Une blogueuse invitée",
  },
  recipeCategory: "Tarte",
})}</head><body></body></html>`;

const CUISINE_AZ_LIKE = `<html><head>${ld({
  "@context": "https://schema.org",
  "@type": "Recipe",
  name: "Poulet rôti aux herbes",
  recipeYield: "4",
  prepTime: "PT15M",
  cookTime: "PT1H",
  totalTime: "PT1H15M",
  recipeCuisine: "French",
  recipeCategory: "Plat principal",
  recipeIngredient: [
    "Préparation",
    "1 poulet fermier",
    "3 c. à soupe Du beurre mou",
    "1 c. à café Thym",
    "Pour la sauce :",
    "10 cl de crème",
  ],
  recipeInstructions: [
    {
      "@type": "HowToStep",
      name: "Étape 1",
      text: "Préchauffe le four à 200 °C.",
    },
    {
      "@type": "HowToStep",
      name: "Étape 2",
      text: "Enduis le poulet de beurre aux herbes.",
    },
    {
      "@type": "HowToStep",
      name: "Étape 2",
      text: "Enduis le poulet de beurre aux herbes.",
    },
  ],
})}</head></html>`;

const JDF_LIKE = `<html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Un
média"}</script>
${ld({
  "@context": "https://schema.org",
  "@type": "Recipe",
  name: "Gaufres : la meilleure recette rapide",
  recipeYield: "6 personnes",
  prepTime: "PT0H10M",
  cookTime: "PT0H15M",
  recipeCuisine: "française",
  recipeCategory: "Gaufre classique",
  recipeIngredient: [
    "250 g farine",
    "2 oeufs",
    "1 sachet de levure chimique",
    "40 cl lait",
  ],
  recipeInstructions:
    "1. Mélange la farine et la levure. 2. Ajoute les oeufs et le lait. 3. Cuis dans le gaufrier chaud.",
})}</head></html>`;

const WORDPRESS_LIKE = `<html><head>
<link rel='canonical' href='/recette/risotto-champignons/'>
<script type='application/ld+json' class='yoast-schema-graph'>${JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://blog-cuisine.fr/recette/risotto-champignons/",
    },
    { "@type": "Article", headline: "Risotto" },
    {
      "@type": "Recipe",
      name: "Recette de risotto aux champignons",
      recipeYield: ["4", "4 personnes"],
      recipeCategory: ["Plat principal"],
      recipeCuisine: ["Italienne"],
      keywords: "risotto, champignons",
      recipeIngredient: [
        "300 g de riz arborio",
        "250 g de champignons",
        "1 l de bouillon",
        "½ verre de vin blanc",
      ],
      recipeInstructions: [
        {
          "@type": "HowToSection",
          name: "Les champignons",
          itemListElement: [
            {
              "@type": "HowToStep",
              text: "Fais revenir les champignons émincés.",
            },
          ],
        },
        {
          "@type": "HowToSection",
          name: "Le riz",
          itemListElement: [
            {
              "@type": "HowToStep",
              text: "Nacre le riz, mouille au vin blanc.",
            },
            {
              "@type": "HowToStep",
              text: "Ajoute le bouillon louche après louche.",
            },
          ],
        },
      ],
    },
  ],
})}</script></head><body></body></html>`;

const MICRODATA_ONLY = `<html><head><title>Clafoutis aux cerises - Le blog de Jeanne</title></head><body>
<header>Accueil · Contact</header>
<div itemscope itemtype="http://schema.org/Recipe">
  <h1 itemprop="name">Clafoutis aux cerises</h1>
  <meta itemprop="prepTime" content="PT20M"><time itemprop="cookTime" datetime="PT40M">40 min</time>
  <span itemprop="recipeYield">6 parts</span>
  <ul>
    <li itemprop="recipeIngredient">500 g de cerises</li>
    <li itemprop="recipeIngredient">3 &oelig;ufs</li>
    <li itemprop="recipeIngredient">100 g de sucre</li>
  </ul>
  <div itemprop="recipeInstructions"><ol><li>Beurre le moule et dispose les cerises.</li><li>Fouette les &oelig;ufs avec le sucre, verse sur les fruits.</li><li>Fais cuire 40 minutes à 180 °C.</li></ol></div>
</div>
<footer>© 2026</footer></body></html>`;

const NO_STRUCTURE = `<html><head><title>Ma soupe</title><script>var tracking = 1;</script>
<style>.x{}</style></head><body><nav>Accueil</nav><article><h1>Soupe de potiron</h1>
<p>Ingrédients : 1 potiron, 1 oignon.</p><p>Fais revenir l'oignon, ajoute le potiron.</p></article>
<footer>Mentions</footer></body></html>`;

describe("readRecipePage (French sites)", () => {
  it("reads a Marmiton-shaped page", () => {
    const page = readRecipePage(
      MARMITON_LIKE,
      "https://www.marmiton.org/recettes/recette_crepes-du-dimanche_1234.aspx?utm_source=x",
    );
    expect(page.sourceUrl).toBe(
      "https://www.marmiton.org/recettes/recette_crepes-du-dimanche_1234.aspx",
    );
    const draft = page.draft!;
    expect(draft.title).toBe("Crêpes du dimanche");
    expect(draft.servings).toBeNull(); // « 15 crêpes » is not 15 guests
    expect(draft).toMatchObject({
      prepMin: 10,
      cookMin: 20,
      category: "dessert",
      method: "structured",
      reformulated: false,
    });
    expect(draft.ingredients.map((i) => [i.label, i.grams])).toEqual([
      ["farine", 250],
      ["4 oeufs", null],
      ["sucre", 30],
      ["lait", 500],
      ["sel", 0.5],
    ]);
    expect(draft.steps).toHaveLength(3);
  });

  it("reads a 750g-shaped page (prep and total only)", () => {
    const draft = readRecipePage(
      SEVEN_FIFTY_LIKE,
      "https://www.750g.com/tartelettes-aux-poires-r1.htm",
    ).draft!;
    expect(draft).toMatchObject({ servings: 4, prepMin: 25, cookMin: null });
    expect(draft.category).toBeNull(); // « Tarte » could be sweet or savoury
    expect(draft.ingredients[2]).toEqual({
      label: "Quelques gouttes d'extrait de vanille",
      grams: null,
      section: null,
    });
    expect(draft.sourceAuthor).toBe("Une blogueuse invitée");
  });

  it("reads a Cuisine AZ-shaped page with headings among ingredients", () => {
    const draft = readRecipePage(
      CUISINE_AZ_LIKE,
      "https://www.cuisineaz.com/recettes/poulet-roti-1.aspx",
    ).draft!;
    expect(draft).toMatchObject({
      servings: 4,
      cookMin: 60,
      category: "plat",
      cuisine: "france",
    });
    expect(draft.ingredients.map((i) => [i.label, i.section])).toEqual([
      ["1 poulet fermier", "Préparation"],
      ["beurre mou", "Préparation"],
      ["Thym", "Préparation"],
      ["crème", "Pour la sauce"],
    ]);
    expect(draft.steps.map((s) => s.text)).toEqual([
      "Préchauffe le four à 200 °C.",
      "Enduis le poulet de beurre aux herbes.",
    ]);
  });

  it("reads a Journal des Femmes-shaped page (broken block, one-text steps)", () => {
    const draft = readRecipePage(
      JDF_LIKE,
      "https://cuisine.journaldesfemmes.fr/recette/1-gaufres",
    ).draft!;
    expect(draft.title).toBe("Gaufres");
    expect(draft).toMatchObject({
      servings: 6,
      prepMin: 10,
      cookMin: 15,
      cuisine: "france",
    });
    expect(draft.ingredients.map((i) => [i.label, i.grams])).toEqual([
      ["farine", 250],
      ["2 oeufs", null],
      ["levure chimique", 11],
      ["lait", 400],
    ]);
    expect(draft.steps.map((s) => s.text)).toEqual([
      "Mélange la farine et la levure.",
      "Ajoute les oeufs et le lait.",
      "Cuis dans le gaufrier chaud.",
    ]);
  });

  it("reads a WordPress recipe plugin graph with sections", () => {
    const page = readRecipePage(
      WORDPRESS_LIKE,
      "https://blog-cuisine.fr/recette/risotto-champignons/?fbclid=abc",
    );
    expect(page.sourceUrl).toBe(
      "https://blog-cuisine.fr/recette/risotto-champignons/",
    );
    const draft = page.draft!;
    expect(draft).toMatchObject({
      title: "Risotto aux champignons",
      servings: 4,
      category: "plat",
      cuisine: "italie",
    });
    expect(draft.ingredients[3]).toMatchObject({
      label: "vin blanc",
      grams: 100,
    });
    expect(draft.steps.map((s) => s.section)).toEqual([
      "Les champignons",
      "Le riz",
      "Le riz",
    ]);
  });

  it("falls back on microdata", () => {
    const draft = readRecipePage(
      MICRODATA_ONLY,
      "https://jeanne-cuisine.fr/clafoutis",
    ).draft!;
    expect(draft).toMatchObject({
      title: "Clafoutis aux cerises",
      servings: 6,
      prepMin: 20,
      cookMin: 40,
    });
    expect(draft.ingredients.map((i) => i.label)).toEqual([
      "cerises",
      "3 œufs",
      "sucre",
    ]);
    expect(draft.steps).toHaveLength(3);
    expect(draft.steps[1]!.text).toBe(
      "Fouette les œufs avec le sucre, verse sur les fruits.",
    );
  });

  it("keeps the readable text when there is no structure", () => {
    const page = readRecipePage(NO_STRUCTURE, "https://blog.fr/soupe");
    expect(page.draft).toBeNull();
    expect(page.title).toBe("Ma soupe");
    expect(page.text).toContain("Soupe de potiron");
    expect(page.text).toContain("Fais revenir l'oignon");
    expect(page.text).not.toMatch(/tracking|Accueil|Mentions/);
  });
});

describe("html helpers", () => {
  it("decodes entities", () => {
    expect(
      decodeEntities("Cr&egrave;me br&ucirc;l&eacute;e &amp; c&#339;ur"),
    ).toBe("Crème brûlée & cœur");
    expect(decodeEntities("&#x27;&laquo;&nbsp;Miam&nbsp;&raquo;&hellip;")).toBe(
      "'« Miam »…",
    );
    expect(decodeEntities("&unknown; &#0;")).toBe("&unknown; &#0;");
  });

  it("keeps a canonical address only on the same site", () => {
    expect(
      canonicalUrl(
        '<link rel="canonical" href="https://evil.example/steal">',
        "https://www.750g.com/a?utm_medium=x",
      ),
    ).toBe("https://www.750g.com/a");
    expect(
      canonicalUrl(
        '<meta property="og:url" content="https://cuisine.journaldesfemmes.fr/r/1">',
        "https://m.journaldesfemmes.fr/r/1",
      ),
    ).toBe("https://cuisine.journaldesfemmes.fr/r/1");
    expect(registrableDomain("a.b.example.co.uk")).toBe("example.co.uk");
    expect(withoutTracking("https://youtu.be/abc?si=zz&t=10#x")).toBe(
      "https://youtu.be/abc?t=10",
    );
  });

  it("reads the article before the page", () => {
    expect(
      pageText(
        "<body><nav>Menu</nav><article><p>Un</p><p>Deux</p></article></body>",
      ),
    ).toBe("Un\nDeux");
  });
});

describe("titles, yields, taxonomy", () => {
  it("cleans SEO titles", () => {
    expect(cleanRecipeTitle("Recette tartine avocat oeuf mollet")).toBe(
      "Tartine avocat oeuf mollet",
    );
    expect(cleanRecipeTitle("Tarte tatin - la recette du chef")).toBe(
      "Tarte tatin",
    );
    expect(cleanRecipeTitle("Poulet basquaise - version rapide")).toBe(
      "Poulet basquaise - version rapide",
    );
    expect(cleanRecipeTitle("Palourdes tomates-olives")).toBe(
      "Palourdes tomates-olives",
    );
  });

  it("counts people only", () => {
    expect(servingsFromYield("4 personnes")).toBe(4);
    expect(servingsFromYield(6)).toBe(6);
    expect(servingsFromYield(["4", "4 personnes"])).toBe(4);
    expect(servingsFromYield("Pour 8 parts")).toBe(8);
    expect(servingsFromYield("24 cookies")).toBeNull();
    expect(servingsFromYield("60 personnes")).toBeNull();
  });

  it("maps categories and cuisines conservatively", () => {
    expect(categoryFrom("Entrées, Plats, Rapide, Tapas")).toBe("entree");
    expect(categoryFrom(["Apéritif"])).toBe("kemia");
    expect(categoryFrom("Velouté")).toBe("soupe");
    expect(categoryFrom("Tarte")).toBeNull();
    expect(cuisineFrom("Cuisine marocaine")).toBe("maroc");
    expect(cuisineFrom("Thaï")).toBe("thailande");
    expect(cuisineFrom("Fr")).toBeNull();
    expect(cuisineFrom("couscous")).toBeNull();
  });
});

describe("parseIngredientLine (French)", () => {
  it.each([
    ["1 kg 500 de pommes", "pommes", 1500],
    ["1,5 kg de pommes de terre", "pommes de terre", 1500],
    ["1/2 l de lait", "lait", 500],
    ["1 ½ cuillère à soupe de miel", "miel", 22.5],
    ["1 1/2 c. à café de sel", "sel", 7.5],
    ["2 à 3 c. à soupe de sucre", "sucre", 30],
    ["une cuillère à soupe d'huile", "huile", 15],
    ["une demi-cuillère à café de cumin", "cumin", 2.5],
    ["1 CS de sauce soja", "sauce soja", 15],
    ["2 cc de paprika", "paprika", 10],
    ["1 c.à.s rase de maïzena", "maïzena", 15],
    ["1 verre de lait", "lait", 200],
    ["1 dl de crème", "crème", 100],
    ["250g de farine", "farine", 250],
    ["200 g environ de farine", "farine", 200],
    ["1 sachet de sucre vanillé", "sucre vanillé", 7.5],
    ["1 sachet de thé", "1 sachet de thé", null],
    ["1 noix de beurre", "beurre", 10],
    ["50 g de noix", "noix", 50],
    ["2 gousses d'ail", "2 gousses d'ail", null],
    ["3 carottes", "3 carottes", null],
    ["2-3 pommes", "2-3 pommes", null],
    ["Sel, poivre", "Sel, poivre", null],
    ["1 lime", "1 lime", null],
  ])("« %s »", (line, label, grams) => {
    expect(parseIngredientLine(line)).toMatchObject({ label, grams });
  });

  it("recognizes headings", () => {
    expect(sectionHeader("Pour la pâte :")).toBe("Pour la pâte");
    expect(sectionHeader("Garniture")).toBe("Garniture");
    expect(sectionHeader("Sauce soja")).toBeNull();
    expect(sectionHeader("Pour 4 personnes :")).toBeNull();
    expect(
      parseIngredientList([
        "Pâte :",
        "200 g de farine",
        "Pour la garniture",
        "20 cl de crème",
      ]).map((i) => [i.label, i.section]),
    ).toEqual([
      ["farine", "Pâte"],
      ["crème", "Pour la garniture"],
    ]);
  });
});
