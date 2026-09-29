import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/recettes/:path*",
    "/coach/:path*",
    "/planning/:path*",
    "/communaute/:path*",
    "/createrices/:path*",
    "/notifications/:path*",
    "/admin/:path*",
    "/profil/:path*",
    "/design/:path*",
    "/onboarding/:path*",
    "/login",
  ],
};
