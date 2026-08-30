import { describe, expect, it } from "vitest";

import { parseFreeTextInput } from "./parse-input";

describe("parseFreeTextInput", () => {
  it("parses quantities in grams", () => {
    expect(parseFreeTextInput("150g de riz")).toEqual([
      { query: "riz", qty: 150, unit: "g", grams: 150 },
    ]);
  });

  it("splits on commas and 'et'", () => {
    const parts = parseFreeTextInput(
      "100g de poulet, 200g de semoule et une tomate",
    );
    expect(parts).toHaveLength(3);
    expect(parts[0]).toMatchObject({ query: "poulet", grams: 100 });
    expect(parts[1]).toMatchObject({ query: "semoule", grams: 200 });
    expect(parts[2]).toMatchObject({ query: "tomate", unit: "portion" });
  });

  it("converts cl and kg", () => {
    expect(parseFreeTextInput("25cl de jus d'orange")[0]).toMatchObject({
      unit: "ml",
      grams: 250,
    });
    expect(parseFreeTextInput("1kg de couscous")[0]).toMatchObject({
      unit: "g",
      grams: 1000,
    });
  });

  it("counts pieces with a default portion", () => {
    expect(parseFreeTextInput("2 œufs")[0]).toMatchObject({
      query: "œufs",
      qty: 2,
      unit: "piece",
      grams: 200,
    });
  });

  it("parses decimal commas", () => {
    expect(parseFreeTextInput("62,5g de boutargue")[0]).toMatchObject({
      grams: 62.5,
    });
  });
});
