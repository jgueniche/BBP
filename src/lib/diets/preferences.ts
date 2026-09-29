import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/db/types";

import {
  ALLERGENS,
  DIETS,
  hasRules,
  type Allergen,
  type Diet,
  type FoodRules,
} from "./types";

export const foodRulesInputSchema = z.object({
  diets: z.array(z.enum(DIETS)).max(DIETS.length),
  allergens: z.array(z.enum(ALLERGENS)).max(ALLERGENS.length),
  dislikes: z.array(z.string().trim().min(2).max(40)).max(20),
  consent: z.boolean(),
});

export type StoredFoodRules = FoodRules & { consentedAt: string | null };

const dietSet = new Set<string>(DIETS);
const allergenSet = new Set<string>(ALLERGENS);

/**
 * The person's cooking rules. Diets and allergies only count with the
 * explicit consent recorded (GDPR art. 9); dislikes need none.
 */
export async function loadStoredFoodRules(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<StoredFoodRules> {
  const { data } = await supabase
    .from("user_settings")
    .select("diets, allergens, dislikes, food_rules_consent_at")
    .eq("user_id", userId)
    .maybeSingle();
  const consentedAt = data?.food_rules_consent_at ?? null;
  return {
    diets: consentedAt
      ? (data?.diets ?? []).filter((d): d is Diet => dietSet.has(d))
      : [],
    allergens: consentedAt
      ? (data?.allergens ?? []).filter((a): a is Allergen => allergenSet.has(a))
      : [],
    dislikes: data?.dislikes ?? [],
    consentedAt,
  };
}

/** Rules to evaluate recipes with, or null when the person set none. */
export async function loadFoodRules(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<FoodRules | null> {
  const stored = await loadStoredFoodRules(supabase, userId);
  return hasRules(stored) ? stored : null;
}
