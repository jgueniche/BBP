import { describe, expect, it } from "vitest";

import { coverSrc, isOwnCoverPath, thumbPathOf } from "./photos";

const me = "01a0f2b5-c799-7687-8527-30ccd71168fe";
const other = "b0000000-0000-4000-8000-00000000000b";
const photo = "44444444-4444-4444-8444-444444444444";

describe("cover photos", () => {
  it("accepts only a cover in my own folder", () => {
    expect(isOwnCoverPath(`${me}/${photo}.jpg`, me)).toBe(true);
    expect(isOwnCoverPath(`${other}/${photo}.jpg`, me)).toBe(false);
    expect(isOwnCoverPath(`${me}/${photo}-thumb.jpg`, me)).toBe(false);
    expect(isOwnCoverPath(`${me}/../${other}/${photo}.jpg`, me)).toBe(false);
    expect(isOwnCoverPath(`${me}/${photo}.png`, me)).toBe(false);
  });

  it("keeps the thumbnail next to its photo", () => {
    expect(thumbPathOf(`${me}/${photo}.jpg`)).toBe(`${me}/${photo}-thumb.jpg`);
  });

  it("serves covers through the app, never a raw path", () => {
    expect(coverSrc(`${me}/${photo}.jpg`)).toBe(
      `/api/photos/recettes/${me}/${photo}.jpg`,
    );
    expect(coverSrc(`${me}/${photo}.jpg`, { thumb: true })).toBe(
      `/api/photos/recettes/${me}/${photo}-thumb.jpg`,
    );
    expect(coverSrc("../../etc/passwd")).toBeNull();
    expect(coverSrc(null)).toBeNull();
  });
});
