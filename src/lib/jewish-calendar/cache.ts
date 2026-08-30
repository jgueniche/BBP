import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/db/types";

import {
  computeCalendarDays,
  DEFAULT_CALENDAR_SETTINGS,
  type CalendarDay,
  type CalendarSettings,
} from "./engine";

type Supabase = SupabaseClient<Database>;

export type UserCalendar = {
  enabled: boolean;
  settings: CalendarSettings;
};

/** Profile city + minhag options, with brief defaults when unset. */
export async function loadCalendarSettings(
  supabase: Supabase,
  userId: string,
): Promise<UserCalendar> {
  const [{ data: settings }, { data: profile }] = await Promise.all([
    supabase
      .from("user_settings")
      .select(
        "israel_calendar, minor_fasts, candle_offset_min, jewish_calendar_enabled",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("profiles").select("city").eq("id", userId).maybeSingle(),
  ]);
  return {
    enabled: settings?.jewish_calendar_enabled ?? true,
    settings: {
      city: profile?.city ?? null,
      israelCalendar: settings?.israel_calendar ?? false,
      minorFasts: settings?.minor_fasts ?? false,
      candleOffsetMin: settings?.candle_offset_min ?? 18,
    },
  };
}

export function settingsHash(settings: CalendarSettings): string {
  return [
    settings.city ?? "",
    settings.israelCalendar ? 1 : 0,
    settings.minorFasts ? 1 : 0,
    settings.candleOffsetMin,
  ].join("|");
}

const HORIZON_BACK_DAYS = 45;
const HORIZON_DAYS = 410; // ~12 months forward + recent past (brief §10.13)

function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(
    new Date(),
  );
}

function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

function dayCountBetween(from: string, to: string): number {
  return (
    Math.round(
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
        86_400_000,
    ) + 1
  );
}

/**
 * Cached per-user calendar read (table `jewish_calendar_cache`). The cache
 * holds ~12 rolling months keyed by a settings hash; a hash mismatch or a
 * hole triggers a full recompute, so a city/minhag change propagates on the
 * next read. Ranges outside the horizon are computed directly.
 */
export async function getCalendarDays(
  supabase: Supabase,
  userId: string,
  from: string,
  to: string,
): Promise<CalendarDay[]> {
  const { settings } = await loadCalendarSettings(supabase, userId);
  const expected = dayCountBetween(from, to);
  const horizonStart = shiftDate(todayKey(), -HORIZON_BACK_DAYS);
  const horizonEnd = shiftDate(horizonStart, HORIZON_DAYS - 1);
  if (from < horizonStart || to > horizonEnd || expected < 1) {
    return computeCalendarDays(from, Math.max(expected, 1), settings);
  }

  const hash = settingsHash(settings);
  const { data: rows } = await supabase
    .from("jewish_calendar_cache")
    .select("date, payload, settings_hash")
    .eq("user_id", userId)
    .gte("date", from)
    .lte("date", to)
    .order("date");

  const fresh =
    rows !== null &&
    rows.length === expected &&
    rows.every((row) => row.settings_hash === hash);
  if (fresh) {
    return rows.map((row) => row.payload as unknown as CalendarDay);
  }

  const horizon = computeCalendarDays(horizonStart, HORIZON_DAYS, settings);
  await supabase.from("jewish_calendar_cache").delete().eq("user_id", userId);
  const { error } = await supabase.from("jewish_calendar_cache").insert(
    horizon.map((day) => ({
      user_id: userId,
      date: day.date,
      payload: day as unknown as Json,
      settings_hash: hash,
    })),
  );
  if (error) console.error("calendar cache refresh failed", error.message);

  return horizon.filter((day) => day.date >= from && day.date <= to);
}

export { DEFAULT_CALENDAR_SETTINGS };
export type { CalendarDay, CalendarSettings };
