import { ImageResponse } from "next/og";

import { fr } from "@/i18n/fr";
import { createAnonClient } from "@/lib/supabase/anon";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { data: recipe } = isSupabaseConfigured
    ? await createAnonClient()
        .from("recipes")
        .select("title, icon, origin, prep_min, cook_min")
        .eq("slug", slug)
        .eq("visibility", "community")
        .eq("status", "published")
        .maybeSingle()
    : { data: null };

  const title = recipe?.title ?? "Copine en cuisine";
  const icon = recipe?.icon ?? "🥘";
  const origins: Readonly<Record<string, string>> = fr.recettes.origins;
  const cuisine = recipe?.origin ? (origins[recipe.origin] ?? null) : null;
  const time =
    recipe && (recipe.prep_min !== null || recipe.cook_min !== null)
      ? `${(recipe.prep_min ?? 0) + (recipe.cook_min ?? 0)} min`
      : null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#FDE7EF",
        padding: 48,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          border: "2px solid #EEE6EA",
          borderRadius: 28,
          backgroundColor: "#FFFFFF",
          boxShadow: "0 24px 48px -16px rgba(11, 11, 11, 0.18)",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", fontSize: 110 }}>{icon}</div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 72,
            fontWeight: 800,
            color: "#2B2230",
            lineHeight: 1.05,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginTop: 32,
            fontSize: 32,
            color: "#4A3F4E",
          }}
        >
          {cuisine && (
            <div
              style={{
                display: "flex",
                border: "2px solid #EEE6EA",
                borderRadius: 999,
                padding: "8px 24px",
                fontWeight: 700,
              }}
            >
              {cuisine}
            </div>
          )}
          {time && <div style={{ display: "flex" }}>{time}</div>}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 28,
          fontSize: 34,
          fontWeight: 800,
          color: "#2B2230",
        }}
      >
        <div style={{ display: "flex" }}>Copine en cuisine</div>
        <div style={{ display: "flex", color: "#C0265E" }}>
          Tes recettes, à plusieurs mains.
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
