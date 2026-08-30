import { ImageResponse } from "next/og";

import { fr } from "@/i18n/fr";
import { createAnonClient } from "@/lib/supabase/anon";

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
  const supabase = createAnonClient();
  const { data: recipe } = await supabase
    .from("recipes")
    .select("title, icon, kashrut_class, is_fish, origin, prep_min, cook_min")
    .eq("slug", slug)
    .eq("visibility", "community")
    .eq("status", "published")
    .maybeSingle();

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
        backgroundColor: "#FBFAF6",
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
          border: "6px solid #0B0B0B",
          borderRadius: 40,
          backgroundColor: "#FBFAF6",
          boxShadow: "12px 12px 0 #0B0B0B",
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
                border: "4px solid #0B0B0B",
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
