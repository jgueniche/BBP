import type { MetadataRoute } from "next";

import { fr } from "@/i18n/fr";

// Web app manifest (brief §10.14): installable, standalone, share target
// towards the recipe importer. Colours follow the "pro & chaleureux" shell.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${fr.app.name} — ${fr.app.fullName}`,
    short_name: fr.app.name,
    description: `${fr.app.tagline} ${fr.pwa.manifestDescription}`,
    lang: "fr",
    dir: "ltr",
    start_url: "/accueil",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F3F1EA",
    theme_color: "#F3F1EA",
    categories: ["health", "food", "lifestyle"],
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
        name: fr.nav.journal,
        url: "/journal",
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
