import { describe, expect, it } from "vitest";

import { analyzeIngredient } from "./ingredients";
import type { Allergen, Diet, EngineIngredient, FoodRules } from "./types";
import { evaluateRecipe, recipeDietFacts } from "./verdict";

const rules = (
  diets: Diet[] = [],
  allergens: Allergen[] = [],
  dislikes: string[] = [],
): FoodRules => ({ diets, allergens, dislikes });

const ing = (
  label: string,
  grams: number | null = 100,
  foodName: string | null = null,
): EngineIngredient => ({ label, grams, foodName });

const attrs = (label: string) => [...analyzeIngredient(label).attributes];
const allergens = (label: string) => [...analyzeIngredient(label).allergens];

const QUICHE = [
  ing("pâte brisée", 250),
  ing("lardons fumés", 200),
  ing("crème fraîche", 200),
  ing("œufs", 150),
  ing("emmental râpé", 80),
];
const RATATOUILLE = [
  ing("aubergines", 400),
  ing("courgettes", 400),
  ing("poivrons", 300),
  ing("tomates", 400),
  ing("huile d'olive", 40),
];
const MOULES = [
  ing("moules de bouchot", 2000),
  ing("vin blanc sec", 200),
  ing("échalotes", 60),
  ing("beurre", 30),
  ing("persil", 10),
];

describe("analyzeIngredient — neutral attributes", () => {
  it("reads meat, pork and poultry products", () => {
    expect(attrs("lardons fumés")).toEqual(
      expect.arrayContaining(["meat", "pork"]),
    );
    expect(attrs("lardons de dinde")).toEqual(["meat"]);
    expect(attrs("blanc de poulet")).toEqual(["meat"]);
    expect(attrs("jambon de Parme")).toContain("pork");
  });

  it("does not misread look-alikes", () => {
    expect(attrs("lait de coco")).toEqual([]);
    expect(attrs("noix de muscade")).toEqual([]);
    expect(allergens("noix de coco râpée")).toEqual([]);
    expect(attrs("une noix de beurre")).toEqual(["dairy"]);
    expect(allergens("une noix de beurre")).not.toContain("tree_nuts");
    expect(attrs("cœurs de palmier")).toEqual([]);
    expect(attrs("vinaigre de cidre")).toEqual([]);
    expect(attrs("sucre glace")).toEqual([]);
    expect(attrs("persil haché")).toEqual([]);
  });

  it("keeps plant-based alternatives free of animal attributes", () => {
    expect(attrs("steak végétal")).toEqual([]);
    expect(attrs("crème végétale d'avoine")).toEqual([]);
    expect(allergens("lait de soja")).toEqual(["soy"]);
    expect(allergens("lait d'amande")).toEqual(["tree_nuts"]);
  });

  it("propagates EU allergens from composite products", () => {
    expect(allergens("sauce soja")).toEqual(
      expect.arrayContaining(["soy", "gluten"]),
    );
    expect(allergens("tahin")).toEqual(["sesame"]);
    expect(allergens("beurre de cacahuète")).toEqual(["peanuts"]);
    expect(allergens("vin blanc")).toContain("sulphites");
    expect(analyzeIngredient("bouillon cube").maybeAllergens).toContain(
      "celery",
    );
  });

  it("honours free-from markers", () => {
    expect(attrs("pâtes sans gluten")).toEqual([]);
    expect(attrs("lait sans lactose")).toEqual(
      expect.arrayContaining(["dairy", "lactose_free"]),
    );
    expect(attrs("saucisses halal")).not.toContain("pork");
  });

  it("uses the linked reference food name too", () => {
    const analysis = analyzeIngredient("bouillon", "Bouillon de volaille");
    expect(analysis.attributes).toContain("meat");
  });
});

describe("evaluateRecipe — one diet at a time", () => {
  it("returns no verdict without rules", () => {
    expect(evaluateRecipe(QUICHE, rules())).toBeNull();
    expect(evaluateRecipe(QUICHE, null)).toBeNull();
  });

  it("vegetarian: ratatouille ok, quiche adaptable with a checked swap", () => {
    expect(evaluateRecipe(RATATOUILLE, rules(["vegetarian"]))?.status).toBe(
      "compatible",
    );
    const quiche = evaluateRecipe(QUICHE, rules(["vegetarian"]));
    expect(quiche?.status).toBe("adaptable");
    const lardons = quiche?.findings.find((f) => f.label === "lardons fumés");
    expect(lardons?.substitution).toEqual({
      kind: "swap",
      label: "tofu fumé en dés",
    });
    expect(quiche?.notes).toContain("rennet");
  });

  it("vegan: dairy, eggs and honey conflict", () => {
    const verdict = evaluateRecipe(QUICHE, rules(["vegan"]));
    const labels = verdict?.findings.map((f) => f.label);
    expect(labels).toEqual(
      expect.arrayContaining(["crème fraîche", "œufs", "emmental râpé"]),
    );
    expect(
      evaluateRecipe([ing("miel", 30), ing("yaourt", 400)], rules(["vegan"]))
        ?.findings,
    ).toHaveLength(2);
  });

  it("pescatarian accepts fish, refuses meat", () => {
    expect(
      evaluateRecipe([ing("saumon"), ing("riz")], rules(["pescatarian"]))
        ?.status,
    ).toBe("compatible");
    expect(
      evaluateRecipe([ing("poulet"), ing("riz")], rules(["pescatarian"]))
        ?.status,
    ).toBe("adaptable");
  });

  it("no pork: lardons become turkey, gelatin is to be checked", () => {
    const quiche = evaluateRecipe(QUICHE, rules(["no_pork"]));
    expect(quiche?.status).toBe("adaptable");
    expect(quiche?.findings[0]?.substitution).toEqual({
      kind: "swap",
      label: "lardons de dinde",
    });
    const panna = evaluateRecipe(
      [ing("crème", 400), ing("gélatine", 6)],
      rules(["no_pork"]),
    );
    expect(panna?.findings[0]?.level).toBe("verify");
    expect(panna?.findings[0]?.substitution).toEqual({
      kind: "swap",
      label: "agar-agar",
    });
  });

  it("no alcohol: wine is swapped, vanilla extract is to be checked", () => {
    const moules = evaluateRecipe(MOULES, rules(["no_alcohol"]));
    expect(moules?.status).toBe("adaptable");
    expect(moules?.findings[0]?.substitution?.kind).toBe("swap");
    const cake = evaluateRecipe(
      [ing("farine", 250), ing("extrait de vanille", 5)],
      rules(["no_alcohol"]),
    );
    expect(cake?.findings[0]?.level).toBe("verify");
  });

  it("halal: pork conflicts, meat carries a certification note", () => {
    const tajine = evaluateRecipe(
      [
        ing("poulet", 1200),
        ing("olives vertes", 150),
        ing("citron confit", 60),
      ],
      rules(["halal"]),
    );
    expect(tajine?.status).toBe("compatible");
    expect(tajine?.notes).toContain("meat_certified_halal");
    expect(evaluateRecipe(QUICHE, rules(["halal"]))?.status).toBe("adaptable");
    expect(evaluateRecipe(MOULES, rules(["halal"]))?.notes).toContain(
      "seafood_practices",
    );
  });

  it("kosher: shellfish, pork, and meat with dairy", () => {
    // Mussels are the dish itself: no swap, so incompatible.
    expect(evaluateRecipe(MOULES, rules(["kosher"]))?.status).toBe(
      "incompatible",
    );
    const blanquette = evaluateRecipe(
      [ing("veau", 1000), ing("crème fraîche", 200), ing("carottes", 300)],
      rules(["kosher"]),
    );
    expect(blanquette?.status).toBe("adaptable");
    const cream = blanquette?.findings.find((f) => f.label === "crème fraîche");
    expect(cream?.causes[0]).toMatchObject({ code: "meat_with_dairy" });
    // The lactose-free cream is still dairy: the plant cream is kept.
    expect(cream?.substitution).toEqual({
      kind: "swap",
      label: "crème végétale d'avoine",
    });
    expect(blanquette?.notes).toContain("meat_certified_kosher");
    const gratin = evaluateRecipe(
      [ing("pommes de terre", 1000), ing("comté", 150)],
      rules(["kosher"]),
    );
    expect(gratin?.status).toBe("compatible");
    expect(gratin?.notes).toContain("cheese_certified_kosher");
  });

  it("gluten free: flour and couscous get gluten-free swaps", () => {
    const verdict = evaluateRecipe(
      [ing("graine de couscous", 500), ing("pois chiches", 200)],
      rules(["gluten_free"]),
    );
    expect(verdict?.status).toBe("adaptable");
    expect(verdict?.findings[0]?.substitution).toEqual({
      kind: "swap",
      label: "quinoa",
    });
    expect(verdict?.notes).toContain("gluten_labels");
    const oats = evaluateRecipe(
      [ing("flocons d'avoine")],
      rules(["gluten_free"]),
    );
    expect(oats?.findings[0]?.level).toBe("verify");
  });

  it("lactose free: aged cheese is fine with a note, cream is swapped", () => {
    const verdict = evaluateRecipe(
      [ing("parmesan", 60), ing("crème liquide", 200), ing("riz", 300)],
      rules(["lactose_free"]),
    );
    expect(verdict?.findings.map((f) => f.label)).toEqual(["crème liquide"]);
    expect(verdict?.findings[0]?.substitution).toEqual({
      kind: "swap",
      label: "crème sans lactose",
    });
    expect(verdict?.notes).toContain("low_lactose");
  });
});

describe("evaluateRecipe — allergies, dislikes, combinations", () => {
  it("allergies: a garnish is removed, a main component is not", () => {
    const salad = evaluateRecipe(
      [ing("quinoa", 300), ing("concombre", 200), ing("noix", 20)],
      rules([], ["tree_nuts"]),
    );
    expect(salad?.status).toBe("adaptable");
    expect(salad?.findings[0]?.substitution?.kind).toBe("swap");
    expect(salad?.notes).toContain("allergy_labels");

    const houmous = evaluateRecipe(
      [ing("pois chiches", 400), ing("tahin", 100), ing("citron", 40)],
      rules([], ["sesame"]),
    );
    expect(houmous?.status).toBe("adaptable");
  });

  it("allergies: a possible allergen is to be checked", () => {
    const soup = evaluateRecipe(
      [ing("poireaux", 400), ing("bouillon cube", 250)],
      rules([], ["celery"]),
    );
    expect(soup?.findings[0]?.level).toBe("verify");
  });

  it("dislikes are always adaptable by leaving the ingredient out", () => {
    const verdict = evaluateRecipe(
      [ing("riz", 300), ing("coriandre fraîche", 20), ing("carottes", 200)],
      rules([], [], ["Coriandre"]),
    );
    expect(verdict?.status).toBe("adaptable");
    expect(verdict?.findings[0]?.substitution).toEqual({ kind: "omit" });
  });

  it("re-checks every swap against all active rules", () => {
    // Vegetarian + soy allergy: smoked tofu is no longer a valid swap.
    const verdict = evaluateRecipe(
      [ing("lardons", 200), ing("pâtes", 400)],
      rules(["vegetarian"], ["soy"]),
    );
    const swap = verdict?.findings[0]?.substitution;
    expect(swap?.kind).toBe("swap");
    expect(swap && swap.kind === "swap" ? swap.label : "").not.toMatch(/tofu/);
  });

  it("vegan + gluten free: the plant cream avoids oats", () => {
    const verdict = evaluateRecipe(
      [ing("crème fraîche", 200), ing("champignons", 400)],
      rules(["vegan", "gluten_free"]),
    );
    expect(verdict?.findings[0]?.substitution).toEqual({
      kind: "swap",
      label: "crème de coco",
    });
  });

  it("an unknown-origin stock is to be checked for vegetarians", () => {
    const verdict = evaluateRecipe(
      [ing("lentilles", 300), ing("bouillon", 500)],
      rules(["vegetarian"]),
    );
    expect(verdict?.status).toBe("adaptable");
    expect(verdict?.findings[0]?.substitution).toEqual({
      kind: "swap",
      label: "bouillon de légumes",
    });
  });

  it("is incompatible when nothing can replace a conflicting ingredient", () => {
    const verdict = evaluateRecipe(
      [ing("boudin noir", 600), ing("pommes", 400)],
      rules(["halal"]),
    );
    expect(verdict?.status).toBe("incompatible");
  });
});

describe("recipeDietFacts — toutes les tables", () => {
  it("shows the most specific diets only", () => {
    const facts = recipeDietFacts(RATATOUILLE);
    expect(facts.diets).toEqual(
      expect.arrayContaining([
        "vegan",
        "halal",
        "kosher",
        "gluten_free",
        "lactose_free",
      ]),
    );
    expect(facts.diets).not.toContain("vegetarian");
    expect(facts.diets).not.toContain("no_pork");
    expect(facts.certifiedMeat).toBe(false);
  });

  it("flags meat to choose certified", () => {
    const facts = recipeDietFacts([ing("poulet", 800), ing("riz", 300)]);
    expect(facts.diets).toContain("halal");
    expect(facts.certifiedMeat).toBe(true);
  });

  it("lists nothing for an empty recipe", () => {
    expect(recipeDietFacts([]).diets).toEqual([]);
  });
});
