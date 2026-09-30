import { prepareUploadImage } from "@/lib/social/photo-client";
import { createClient } from "@/lib/supabase/client";

import { CAPTURE_BUCKET, MAX_CAPTURES } from "./captures";
// Screenshots keep more pixels than photos: the text must stay readable.
const CAPTURE_MAX_SIDE = 2048;

/**
 * Re-encodes captures in the browser (no EXIF, no geolocation) and puts them
 * in the member's private folder, where the import job reads then deletes
 * them. Returns their paths, in order.
 */
export async function uploadCaptures(files: File[]): Promise<string[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const paths: string[] = [];
  for (const file of files.slice(0, MAX_CAPTURES)) {
    const blob = await prepareUploadImage(file, CAPTURE_MAX_SIDE);
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from(CAPTURE_BUCKET)
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) {
      if (paths.length > 0)
        await supabase.storage.from(CAPTURE_BUCKET).remove(paths);
      throw new Error(error.message);
    }
    paths.push(path);
  }
  return paths;
}
