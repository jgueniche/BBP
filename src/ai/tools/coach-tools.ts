import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { tool } from "ai";
import { z } from "zod";

import type { Database } from "@/db/types";
import { generateAndStoreWeek } from "@/lib/planning/generate";
import { toDateString, weekStartOf } from "@/lib/planning/week";

// Cooking-only tools (pivot, ADR-028): recipes and the meal plan. The health
// tools (journal, weight, wellbeing flag) left with the health tracking.
export function buildCoachTools(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
}) {
  const { supabase, userId } = params;

  return {
    get_plan: tool({
      description:
        "Lit le planning de repas d'une semaine (par défaut la semaine en cours).",
      inputSchema: z.object({
        week: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      }),
      execute: async ({ week }) => {
        const weekStart = weekStartOf(week ?? toDateString(new Date()));
        const { data: plan } = await supabase
          .from("meal_plans")
          .select("id")
          .eq("user_id", userId)
          .eq("week_start", weekStart)
          .maybeSingle();
        if (!plan) return { weekStart, meals: [], url: "/planning" };
        const { data: slots } = await supabase
          .from("meal_plan_slots")
          .select("date, meal, title, servings, is_leftover")
          .eq("plan_id", plan.id)
          .order("date");
        return {
          weekStart,
          meals: slots ?? [],
          url: `/planning?semaine=${weekStart}`,
        };
      },
    }),

    search_recipes: tool({
      description:
        "Cherche des recettes par mot-clé dans le titre. Retourne catégorie, temps, portions et lien.",
      inputSchema: z.object({
        query: z.string().min(2).max(80),
      }),
      execute: async ({ query }) => {
        const { data } = await supabase
          .from("recipes")
          .select(
            "title, slug, category, prep_min, cook_min, servings, tags, source_author",
          )
          .eq("status", "published")
          .ilike("title", `%${query}%`)
          .limit(6);
        return {
          recipes: (data ?? []).map((recipe) => ({
            ...recipe,
            url: `/recettes/${recipe.slug}`,
          })),
        };
      },
    }),

    propose_meal_plan: tool({
      description:
        "Génère (ou régénère) le planning de repas d'une semaine en respectant les règles de cuisine du profil, et l'enregistre. À utiliser quand la personne demande un menu de la semaine.",
      inputSchema: z.object({
        week: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        constraints: z.string().max(300).optional(),
      }),
      execute: async ({ week, constraints }) => {
        const weekStart = weekStartOf(week ?? toDateString(new Date()));
        const result = await generateAndStoreWeek(
          supabase,
          userId,
          weekStart,
          constraints ?? null,
        );
        if (!result.ok) {
          return {
            ok: false,
            reason:
              result.code === "quota"
                ? "Quota de générations atteint pour cette semaine."
                : "Pas assez de recettes disponibles pour planifier.",
          };
        }
        return {
          ok: true,
          weekStart,
          mealsPlanned: result.mealsPlanned,
          url: `/planning?semaine=${weekStart}`,
          note: "Invite la personne à voir son menu sur la page Planning.",
        };
      },
    }),
  };
}
