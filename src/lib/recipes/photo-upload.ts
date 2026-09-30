import { prepareUploadImage } from "@/lib/social/photo-client";
import { createClient } from "@/lib/supabase/client";

import {
  COVER_MAX_SIDE,
  RECIPE_PHOTO_BUCKET,
  THUMB_MAX_SIDE,
  thumbPathOf,
} from "./photos";

/**
 * Re-encodes the cover in the browser (no EXIF, no geolocation), with a
 * small copy for cards, both in the member's own folder.
 */
export async function uploadCover(file: File): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const path = `${user.id}/${crypto.randomUUID()}.jpg`;
  const [cover, thumb] = await Promise.all([
    prepareUploadImage(file, COVER_MAX_SIDE),
    prepareUploadImage(file, THUMB_MAX_SIDE),
  ]);
  const bucket = supabase.storage.from(RECIPE_PHOTO_BUCKET);
  const first = await bucket.upload(path, cover, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (first.error) throw new Error(first.error.message);
  const second = await bucket.upload(thumbPathOf(path), thumb, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (second.error) {
    await bucket.remove([path]);
    throw new Error(second.error.message);
  }
  return path;
}

/** A cover picked then abandoned before saving. */
export async function discardCover(path: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage
    .from(RECIPE_PHOTO_BUCKET)
    .remove([path, thumbPathOf(path)]);
}
