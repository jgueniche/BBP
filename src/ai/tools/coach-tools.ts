import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { tool } from "ai";
import { z } from "zod";

import type { Database } from "@/db/types";
import { classifyMeal, type KashrutClass } from "@/lib/kashrut/meal";
import { computeTotals, type FoodLogItem } from "@/lib/nutrition/items";
import { computeTrend, weeklyTrendChange } from "@/lib/nutrition/ewma";

const NOT_AVAILABLE = (session: string) => ({
  available: false,
  message: `Fonctionnalité pas encore disponible (arrive avec la session ${session} de BBP).`,
});

export function buildCoachTools(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  safeMode: boolean;
}) {
  const { supabase, userId, safeMode } = params;

  return {
    get_journal: tool({
      description:
        "Lit le journal alimentaire des N derniers jours (totaux par jour et repas).",
      inputSchema: z.object({
        days: z.number().int().min(1).max(14).default(7),
      }),
      execute: async ({ days }) => {
        const since = new Date(Date.now() - days * 86_400_000)
          .toISOString()
          .slice(0, 10);
        const { data } = await supabase
          .from("food_logs")
          .select("date, meal, totals, kashrut_class")
          .eq("user_id", userId)
          .gte("date", since)
          .order("date");
        return {
          days: data ?? [],
          note: safeMode ? "Mode sécurité : ne cite aucun chiffre." : undefined,
        };
      },
    }),

    get_weight: tool({
      description:
        "Lit l'historique de poids et la tendance lissée des N derniers jours.",
      inputSchema: z.object({
        days: z.number().int().min(7).max(365).default(30),
      }),
      execute: async ({ days }) => {
        const since = new Date(Date.now() - days * 86_400_000)
          .toISOString()
          .slice(0, 10);
        const { data } = await supabase
          .from("weight_logs")
          .select("date, weight_kg")
          .eq("user_id", userId)
          .gte("date", since)
          .order("date");
        const trend = computeTrend(data ?? []);
        return {
          lastTrendKg: trend.at(-1)?.trend_kg ?? null,
          weeklyChangeKg: weeklyTrendChange(trend),
          points: trend.slice(-14),
          note: safeMode ? "Mode sécurité : ne cite aucun chiffre." : undefined,
        };
      },
    }),

    log_weight: tool({
      description: "Enregistre le poids du jour en kilogrammes.",
      inputSchema: z.object({
        kg: z.number().min(20).max(500),
      }),
      execute: async ({ kg }) => {
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Paris",
        }).format(new Date());
        const { error } = await supabase
          .from("weight_logs")
          .upsert(
            { user_id: userId, date: today, weight_kg: kg, source: "manual" },
            { onConflict: "user_id,date" },
          );
        if (error) return { ok: false, error: error.message };
        return { ok: true, date: today };
      },
    }),

    log_food: tool({
      description:
        "Enregistre un repas simple dans le journal (aliments avec grammes). Cherche chaque aliment dans la base pour la nutrition.",
      inputSchema: z.object({
        meal: z.enum(["petit_dej", "dej", "diner", "collation"]),
        items: z
          .array(
            z.object({
              name: z.string().min(2).max(80),
              grams: z.number().min(1).max(3000),
            }),
          )
          .min(1)
          .max(10),
      }),
      execute: async ({ meal, items }) => {
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Paris",
        }).format(new Date());

        const resolved: FoodLogItem[] = [];
        for (const item of items) {
          const { data: candidates } = await supabase.rpc("search_foods", {
            q: item.name,
            max_results: 1,
          });
          const best = candidates?.[0];
          resolved.push({
            food_id: best?.id ?? null,
            name: best?.name_fr ?? item.name,
            qty: item.grams,
            unit: "g",
            grams: item.grams,
            per_100g: (best?.per_100g ?? {}) as Record<string, number>,
            kashrut_class: (best?.kashrut_class ?? null) as KashrutClass | null,
            is_fish: best?.is_fish ?? false,
            kosher_hint: best?.kosher_hint ?? null,
            confidence: best ? 0.8 : 0.3,
          });
        }

        const totals = computeTotals(resolved);
        const { kashrutClass, conflict } = classifyMeal(
          resolved.map((i) => i.kashrut_class),
        );
        const { error } = await supabase.from("food_logs").insert({
          user_id: userId,
          date: today,
          meal,
          items: resolved,
          totals,
          kashrut_class: kashrutClass,
          source: "text",
          raw_input: "via Kémia",
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true, totals, kashrutClass, conflict };
      },
    }),

    flag_wellbeing: tool({
      description:
        "À appeler dès que tu perçois des signes de trouble alimentaire, de détresse, une grossesse, un allaitement ou un mineur. Active le mode accompagnement doux de l'app.",
      inputSchema: z.object({
        reason: z.string().min(3).max(200),
      }),
      execute: async ({ reason }) => {
        await supabase
          .from("health_profile")
          .upsert({ user_id: userId, wellbeing_flag: true });
        console.warn("wellbeing flag set", { userId, reason });
        return {
          ok: true,
          instruction:
            "Flag posé. À partir de maintenant : ton chaleureux et posé, aucun chiffre, aucun humour, oriente vers un médecin ou un diététicien.",
        };
      },
    }),

    get_plan: tool({
      description: "Lit le planning de repas de la semaine.",
      inputSchema: z.object({
        week: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      }),
      execute: async () => NOT_AVAILABLE("9 (planning)"),
    }),

    search_recipes: tool({
      description: "Cherche des recettes BBP (casher, origine, temps, tags).",
      inputSchema: z.object({
        query: z.string().min(2).max(80),
      }),
      execute: async () => NOT_AVAILABLE("7 (recettes)"),
    }),

    propose_meal_plan: tool({
      description:
        "Génère un planning de repas hebdomadaire sous contraintes casher.",
      inputSchema: z.object({
        week: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        constraints: z.string().max(300).optional(),
      }),
      execute: async () => NOT_AVAILABLE("9 (planning)"),
    }),

    create_workout_program: tool({
      description: "Crée un programme sportif personnalisé.",
      inputSchema: z.object({
        goal: z.string().max(120).optional(),
        daysPerWeek: z.number().int().min(1).max(7).optional(),
      }),
      execute: async () => NOT_AVAILABLE("10 (sport)"),
    }),

    set_reminder: tool({
      description: "Programme un rappel pour l'utilisateur.",
      inputSchema: z.object({
        when: z.string().max(60),
        text: z.string().max(200),
      }),
      execute: async () => NOT_AVAILABLE("12 (notifications)"),
    }),
  };
}
