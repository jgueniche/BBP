import { createClient } from "@/lib/supabase/client";

import { AVATAR_BUCKET, AVATAR_SIDE, squareCrop } from "./avatars";

/**
 * Square profile photo, re-encoded on a canvas (EXIF and geolocation are
 * dropped), uploaded to the person's own folder. Returns its storage path.
 */
export async function uploadAvatar(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const crop = squareCrop(bitmap.width, bitmap.height);
  const side = Math.min(AVATAR_SIDE, crop.side);
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas unavailable");
  context.drawImage(
    bitmap,
    crop.sx,
    crop.sy,
    crop.side,
    crop.side,
    0,
    0,
    side,
    side,
  );
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error("encode failed")),
      "image/jpeg",
      0.85,
    );
  });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const path = `${user.id}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(error.message);
  return path;
}
