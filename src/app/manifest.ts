import type { MetadataRoute } from "next";

import { fr } from "@/i18n/fr";

// Web app manifest: installable, standalone, share target towards the recipe
// importer (Android; iOS needs the native shell, see docs/PIVOT-2026.md).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: fr.app.name,
    short_name: fr.app.name,
    description: fr.pwa.manifestDescription,
    lang: "fr",
    dir: "ltr",
    start_url: "/recettes",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    categories: ["food", "lifestyle", "social"],
    icons: [
      { src: "/brand/png/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/png/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/brand/png/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: fr.recettes.importCta,
        url: "/recettes/importer",
        icons: [{ src: "/brand/png/icon-192.png", sizes: "192x192" }],
      },
      {
        name: fr.nav.coach,
        url: "/coach",
        icons: [{ src: "/brand/png/icon-192.png", sizes: "192x192" }],
      },
    ],
    share_target: {
      action: "/recettes/importer",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
}
