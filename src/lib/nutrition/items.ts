import { z } from "zod";

export const foodLogItemSchema = z.object({
  food_id: z.uuid().nullable().default(null),
  name: z.string().min(1),
  qty: z.number().positive(),
  unit: z.enum(["g", "ml", "piece", "portion"]),
  grams: z.number().positive(),
  per_100g: z.record(z.string(), z.number()).default({}),
  kashrut_class: z
    .enum(["bassari", "halavi", "parve"])
    .nullable()
    .default(null),
  is_fish: z.boolean().default(false),
  kosher_hint: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1).default(1),
});

export type FoodLogItem = z.infer<typeof foodLogItemSchema>;

export const NUTRIENT_KEYS = [
  "kcal",
  "protein_g",
  "carb_g",
  "fat_g",
  "sugars_g",
  "fiber_g",
  "satfat_g",
  "sodium_mg",
] as const;

export type Totals = Partial<Record<(typeof NUTRIENT_KEYS)[number], number>>;

export function computeTotals(items: FoodLogItem[]): Totals {
  const totals: Record<string, number> = {};
  for (const item of items) {
    const factor = item.grams / 100;
    for (const key of NUTRIENT_KEYS) {
      const value = item.per_100g[key];
      if (typeof value === "number") {
        totals[key] = (totals[key] ?? 0) + value * factor;
      }
    }
  }
  for (const key of Object.keys(totals)) {
    totals[key] = Math.round(totals[key]! * 10) / 10;
  }
  return totals;
}
