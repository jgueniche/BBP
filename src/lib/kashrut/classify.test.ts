import { describe, expect, it } from "vitest";

import { classifyRecipe } from "./classify";

const linked = (
  label: string,
  foodClass: "bassari" | "halavi" | "parve" | null,
  foodIsFish = false,
) => ({ label, foodClass, foodIsFish });

const raw = (label: string) => ({ label, foodClass: null });

describe("classifyRecipe", () => {
  it("classifies a meat couscous as bassari", () => {
    const result = classifyRecipe([
      linked("bœuf haché", "bassari"),
      linked("semoule", "parve"),
      linked("légumes", "parve"),
    ]);
    expect(result.kashrutClass).toBe("bassari");
    expect(result.confidence).toBe(1);
  });

  it("classifies a feta chakchouka as halavi", () => {
    const result = classifyRecipe([
      linked("feta", "halavi"),
      linked("tomates", "parve"),
      linked("œufs", "parve"),
    ]);
    expect(result.kashrutClass).toBe("halavi");
  });

  it("marks fish recipes parve with is_fish", () => {
    const result = classifyRecipe([
      linked("cabillaud", "parve", true),
      linked("semoule", "parve"),
    ]);
    expect(result.kashrutClass).toBe("parve");
    expect(result.isFish).toBe(true);
  });

  it("flags a meat+dairy mix and refuses a class", () => {
    const result = classifyRecipe([
      linked("poulet", "bassari"),
      linked("crème", "halavi"),
    ]);
    expect(result.kashrutClass).toBeNull();
    expect(result.flags.join(" ")).toContain("viande + lait");
  });

  it("uses keyword rules for unlinked labels", () => {
    const result = classifyRecipe([
      raw("escalopes de dinde"),
      raw("semoule complète"),
    ]);
    expect(result.kashrutClass).toBe("bassari");
  });

  it("does not misread 'lait de coco' as dairy", () => {
    const result = classifyRecipe([raw("lait de coco"), raw("poulet fermier")]);
    expect(result.kashrutClass).toBe("bassari");
  });

  it("flags shellfish and gelatin as ingredients to check", () => {
    const result = classifyRecipe([raw("crevettes roses"), raw("gélatine")]);
    expect(result.flags.length).toBeGreaterThanOrEqual(2);
    expect(result.confidence).toBeLessThan(0.8);
  });

  it("flags fish + meat in the same recipe", () => {
    const result = classifyRecipe([
      linked("thon", "parve", true),
      linked("bœuf", "bassari"),
    ]);
    expect(result.flags.join(" ")).toContain("poisson + viande");
    expect(result.isFish).toBe(false);
    expect(result.kashrutClass).toBe("bassari");
  });

  it("drops confidence with many unknown ingredients", () => {
    const result = classifyRecipe([
      raw("mystère 1"),
      raw("mystère 2"),
      raw("mystère 3"),
      raw("tomates"),
    ]);
    expect(result.confidence).toBeLessThan(0.8);
  });
});
