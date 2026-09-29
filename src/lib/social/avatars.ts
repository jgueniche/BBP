import { supabaseUrl } from "@/lib/supabase/config";

export const AVATAR_BUCKET = "profile-photos";
export const AVATAR_SIDE = 400;

const PATH = /^([0-9a-f-]{36})\/[0-9a-f-]{36}\.jpg$/;

/** Same rule as the profiles_avatar_path check: the person's own folder. */
export function isOwnAvatarPath(path: string, userId: string): boolean {
  const match = PATH.exec(path);
  return match !== null && match[1] === userId;
}

export function avatarPublicUrl(path: string | null): string | null {
  if (!path) return null;
  return `${supabaseUrl}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

/** Centred square to crop from a photo before it is resized. */
export function squareCrop(
  width: number,
  height: number,
): { sx: number; sy: number; side: number } {
  const side = Math.max(0, Math.min(width, height));
  return {
    sx: Math.round((width - side) / 2),
    sy: Math.round((height - side) / 2),
    side,
  };
}

/** First letter of the name for the monogram, accents kept. */
export function initialOf(name: string | null): string {
  const letter = (name ?? "").trim().match(/\p{L}|\p{N}/u)?.[0];
  return letter ? letter.toLocaleUpperCase("fr-FR") : "·";
}
