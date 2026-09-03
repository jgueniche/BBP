import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";
import { createAnonClient } from "@/lib/supabase/anon";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.5 },
  ];
  if (!isSupabaseConfigured) return entries;

  const { data } = await createAnonClient()
    .from("recipes")
    .select("slug, updated_at")
    .eq("visibility", "community")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(2000);

  for (const recipe of data ?? []) {
    entries.push({
      url: `${base}/r/${recipe.slug}`,
      lastModified: new Date(recipe.updated_at),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }
  return entries;
}
