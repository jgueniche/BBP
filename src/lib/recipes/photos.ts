// Cover photos (ADR-036): the member's own photo of her recipe, in a private
// bucket readable as far as the recipe is. Never a creator's image.

export const RECIPE_PHOTO_BUCKET = "recipe-photos";
export const COVER_MAX_SIDE = 1600;
export const THUMB_MAX_SIDE = 480;

const COVER_PATH = /^([0-9a-f-]{36})\/[0-9a-f-]{36}\.jpg$/;

/** A cover the member uploaded in her own folder (checked on the server). */
export function isOwnCoverPath(path: string, userId: string): boolean {
  const match = COVER_PATH.exec(path);
  return match !== null && match[1] === userId;
}

/** Its small copy for cards, stored next to it. */
export function thumbPathOf(path: string): string {
  return path.replace(/\.jpg$/, "-thumb.jpg");
}

/** Where the app serves a cover (read with the reader's session). */
export function coverSrc(
  path: string | null | undefined,
  options: { thumb?: boolean } = {},
): string | null {
  if (!path || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/.test(path)) return null;
  return `/api/photos/recettes/${options.thumb ? thumbPathOf(path) : path}`;
}
