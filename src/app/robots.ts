import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

// Only the public surface is crawlable: shared recipes and the login page.
// Everything behind the session guard is private health data (brief §9).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/r/", "/login"],
        disallow: [
          "/api/",
          "/accueil",
          "/journal",
          "/coach",
          "/planning",
          "/sport",
          "/communaute",
          "/recettes",
          "/progres",
          "/poids",
          "/profil",
          "/admin",
          "/design",
          "/onboarding",
          "/courses/",
          "/serwist/",
          "/~offline",
        ],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
