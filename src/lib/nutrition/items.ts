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
