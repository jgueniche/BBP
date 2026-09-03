import { ImageResponse } from "next/og";

import { fr } from "@/i18n/fr";
import { createAnonClient } from "@/lib/supabase/anon";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

const KASHRUT_COLORS: Record<string, string> = {
  bassari: "#A63D2F",
  halavi: "#5B7DB1",
  parve: "#7A7A7A",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { data: recipe } = isSupabaseConfigured
    ? await createAnonClient()
        .from("recipes")
        .select(
          "title, icon, kashrut_class, is_fish, origin, prep_min, cook_min",
        )
        .eq("slug", slug)
        .eq("visibility", "community")
        .eq("status", "published")
        .maybeSingle()
    : { data: null };

  const title = recipe?.title ?? "Boukha, Boutargue & Protéines";
  const icon = recipe?.icon ?? "🥘";
  const kashrut = recipe?.kashrut_class ?? null;
  const kashrutLabel = kashrut
    ? kashrut === "parve" && recipe?.is_fish
      ? fr.kashrut.parveFish
      : fr.kashrut[kashrut as "bassari" | "halavi" | "parve"]
    : null;
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
        backgroundColor: "#F3F1EA",
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
          border: "2px solid #E7E3D7",
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
            color: "#0B0B0B",
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
            color: "#3d3d3d",
          }}
        >
          {kashrutLabel && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: "2px solid #E7E3D7",
                borderRadius: 999,
                padding: "8px 24px",
                fontWeight: 700,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  backgroundColor: KASHRUT_COLORS[kashrut ?? "parve"],
                }}
              />
              {kashrutLabel}
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
          color: "#0B0B0B",
        }}
      >
        <div style={{ display: "flex" }}>
          BBP — Boukha, Boutargue & Protéines
        </div>
        <div style={{ display: "flex", color: "#F26A1B" }}>
          Mange. Bouge. Bsahtek.
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
