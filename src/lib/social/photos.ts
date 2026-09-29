import { supabaseUrl } from "@/lib/supabase/config";

export const POST_PHOTO_BUCKET = "post-photos";
export const MAX_POST_PHOTOS = 4;
export const PHOTO_MAX_SIDE = 1600;

/** Size that fits in a max × max box, never upscaled. */
export function fitWithin(
  width: number,
  height: number,
  max: number = PHOTO_MAX_SIDE,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

const PATH = /^([0-9a-f-]{36})\/[0-9a-f-]{36}\.(jpg|webp)$/;

/** A path the person uploaded in their own folder (checked server side). */
export function isOwnPhotoPath(path: string, userId: string): boolean {
  const match = PATH.exec(path);
  return match !== null && match[1] === userId;
}

export function publicPhotoUrl(path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${POST_PHOTO_BUCKET}/${path}`;
}
