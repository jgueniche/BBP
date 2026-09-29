import { describe, expect, it } from "vitest";

import { PASTEL_BG, PASTELS, pastelAt, pastelFor } from "./pastel";

describe("pastelAt", () => {
  it("cycles through the palette so neighbours differ", () => {
    const tints = [0, 1, 2, 3, 4, 5, 6].map(pastelAt);
    expect(tints.slice(0, 6)).toEqual([...PASTELS]);
    expect(tints[6]).toBe("rose");
    for (let i = 1; i < tints.length; i++) {
      expect(tints[i]).not.toBe(tints[i - 1]);
    }
  });

  it("handles negative and fractional indexes", () => {
    expect(pastelAt(-1)).toBe("ciel");
    expect(pastelAt(2.7)).toBe("menthe");
  });
});

describe("pastelFor", () => {
  it("is stable for the same key", () => {
    expect(pastelFor("tarte-fine-abricots")).toBe(
      pastelFor("tarte-fine-abricots"),
    );
  });

  it("always returns a known pastel with a background class", () => {
    for (const key of ["", "a", "b", "7f3c2e", "dîner-de-samedi"]) {
      const tint = pastelFor(key);
      expect(PASTELS).toContain(tint);
      expect(PASTEL_BG[tint]).toBe(`bg-${tint}`);
    }
  });
});
