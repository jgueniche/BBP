import { describe, expect, it } from "vitest";

import { formatNumberFr } from "./format";

describe("formatNumberFr", () => {
  it("uses a French decimal comma", () => {
    expect(formatNumberFr(0.25)).toBe("0,3");
    expect(formatNumberFr(72.5)).toBe("72,5");
  });

  it("groups thousands with a French separator", () => {
    // fr-FR grouping uses a (narrow) no-break space depending on the ICU version.
    expect(formatNumberFr(1834)).toMatch(/^1[\s  ]834$/);
  });
});
