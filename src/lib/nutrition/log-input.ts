import { z } from "zod";

import { foodLogItemSchema } from "./items";

// Shared between the journal Server Actions and the offline queue so both
// sides validate the exact same payload (Zod at every boundary, brief §6).
export const MEALS = [
  "petit_dej",
  "dej",
  "diner",
  "collation",
  "chabbat_vendredi",
  "chabbat_samedi",
] as const;

export type MealType = (typeof MEALS)[number];

export const LOG_SOURCES = [
  "text",
  "photo",
  "voice",
  "barcode",
  "recipe",
  "repeat",
  "manual",
] as const;

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const logMealInputSchema = z.object({
  date: dateSchema,
  meal: z.enum(MEALS),
  items: z.array(foodLogItemSchema).min(1).max(20),
  source: z.enum(LOG_SOURCES),
  rawInput: z.string().max(2000).nullish(),
});

export type LogMealInput = z.infer<typeof logMealInputSchema>;

/**
 * A meal captured without network (brief §10.14). Foods cannot be resolved
 * against the database offline, so only names and grams are kept; the
 * server re-resolves them (nutrition, kashrut class) when the queue syncs.
 */
export const queuedMealSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    date: dateSchema,
    meal: z.enum(MEALS),
    items: z
      .array(
        z.object({
          name: z.string().min(1).max(120),
          grams: z.number().positive().max(5000),
        }),
      )
      .min(1)
      .max(20),
    rawInput: z.string().max(2000).nullable(),
    source: z.enum(["text", "voice"]),
  }),
  z.object({
    kind: z.literal("favorite"),
    date: dateSchema,
    meal: z.enum(MEALS),
    label: z.string().min(1).max(60),
  }),
]);

export type QueuedMeal = z.infer<typeof queuedMealSchema>;
