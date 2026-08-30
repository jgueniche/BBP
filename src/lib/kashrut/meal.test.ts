import { describe, expect, it } from "vitest";

import { classifyMeal, meatWaitStatus } from "./meal";

describe("classifyMeal", () => {
  it("classifies a meat meal", () => {
    expect(classifyMeal(["bassari", "parve"])).toEqual({
      kashrutClass: "bassari",
      conflict: false,
      uncertain: false,
    });
  });

  it("classifies a dairy meal", () => {
    expect(classifyMeal(["halavi", "parve", "parve"]).kashrutClass).toBe(
      "halavi",
    );
  });

  it("flags a meat+dairy conflict", () => {
    const result = classifyMeal(["bassari", "halavi"]);
    expect(result.conflict).toBe(true);
    expect(result.kashrutClass).toBeNull();
  });

  it("is parve when everything is parve", () => {
    expect(classifyMeal(["parve", "parve"]).kashrutClass).toBe("parve");
  });

  it("marks unknown items as uncertain", () => {
    const result = classifyMeal(["parve", null]);
    expect(result.uncertain).toBe(true);
    expect(result.kashrutClass).toBe("parve");
  });
});

describe("meatWaitStatus", () => {
  const lunch = new Date("2026-08-30T12:00:00Z");

  it("is active within the wait window", () => {
    const status = meatWaitStatus(lunch, 6, new Date("2026-08-30T14:00:00Z"));
    expect(status.active).toBe(true);
    expect(status.remainingMinutes).toBe(240);
  });

  it("ends after the configured hours", () => {
    const status = meatWaitStatus(lunch, 6, new Date("2026-08-30T18:00:01Z"));
    expect(status.active).toBe(false);
  });

  it("supports the 5.5h minhag", () => {
    const status = meatWaitStatus(lunch, 5.5, new Date("2026-08-30T17:00:00Z"));
    expect(status.active).toBe(true);
    expect(status.remainingMinutes).toBe(30);
  });

  it("is inactive without a meat meal", () => {
    expect(meatWaitStatus(null, 6).active).toBe(false);
  });
});
