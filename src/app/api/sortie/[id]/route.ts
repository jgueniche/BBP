import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { safeOutboundUrl } from "@/lib/creators/credit";
import { createAnonClient } from "@/lib/supabase/anon";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * « Voir l'original »: counts the click for the creator (no member id kept)
 * and sends the visitor to her post. Visitors of a public page go there
 * too, uncounted.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const recipeId = z.uuid().safeParse(id);
  const home = new URL("/", request.url);
  if (!recipeId.success || !isSupabaseConfigured) {
    return NextResponse.redirect(home);
  }

  const supabase = await createClient();
  const { data: counted } = await supabase.rpc("log_outbound_click", {
    rid: recipeId.data,
  });
  let target = typeof counted === "string" ? counted : null;
  if (!target) {
    const { data } = await createAnonClient()
      .from("recipes")
      .select("source_url")
      .eq("id", recipeId.data)
      .eq("visibility", "community")
      .eq("status", "published")
      .maybeSingle();
    target = data?.source_url ?? null;
  }

  const destination = safeOutboundUrl(target);
  const response = NextResponse.redirect(destination ?? home);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
