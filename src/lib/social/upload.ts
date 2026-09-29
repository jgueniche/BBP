import { createClient } from "@/lib/supabase/client";

import { prepareUploadImage } from "./photo-client";
import { POST_PHOTO_BUCKET } from "./photos";

/** Re-encode (no geolocation) and upload photos to the person's folder. */
export async function uploadPostPhotos(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const paths: string[] = [];
  for (const file of files) {
    const blob = await prepareUploadImage(file);
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from(POST_PHOTO_BUCKET)
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) throw new Error(error.message);
    paths.push(path);
  }
  return paths;
}
