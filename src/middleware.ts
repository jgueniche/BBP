import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/journal/:path*",
    "/poids/:path*",
    "/recettes/:path*",
    "/coach/:path*",
    "/planning/:path*",
    "/sport/:path*",
    "/communaute/:path*",
    "/admin/:path*",
    "/profil/:path*",
    "/design/:path*",
    "/onboarding/:path*",
    "/login",
  ],
};
