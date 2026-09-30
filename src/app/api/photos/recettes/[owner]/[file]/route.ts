import { NextResponse } from "next/server";

import { RECIPE_PHOTO_BUCKET } from "@/lib/recipes/photos";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const OWNER = /^[0-9a-f-]{36}$/;
const FILE = /^[0-9a-f-]{36}(-thumb)?\.jpg$/;

// Cover photos (ADR-036) are read with the reader's own session (or none):
// the bucket's policy shows a photo only as far as its recipe is visible.
// A path never changes content (each upload gets a new name), so the
// browser keeps it.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; file: string }> },
) {
  const { owner, file } = await params;
  if (!isSupabaseConfigured || !OWNER.test(owner) || !FILE.test(file)) {
    return new NextResponse(null, { status: 404 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(RECIPE_PHOTO_BUCKET)
    .download(`${owner}/${file}`);
  if (error || !data) return new NextResponse(null, { status: 404 });
  return new NextResponse(data.stream(), {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "private, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
