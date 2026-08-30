import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import { getCalendarDays } from "@/lib/jewish-calendar/cache";
import type { KashrutClass } from "@/lib/kashrut/meal";
import type { PlanMeal } from "@/lib/planning/types";
import { addDays, toDateString, weekStartOf } from "@/lib/planning/week";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { PlanningGrid, type GridDay, type GridSlot } from "./planning-grid";

const t = fr.planning;

function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string }>;
}) {
  const params = await searchParams;

  if (!isSupabaseConfigured) {
    return (
      <section>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {t.title}
        </h1>
        <p className="mt-4 text-ink-70">{fr.auth.notConfigured}</p>
      </section>
    );
  }

  const today = toDateString(new Date());
  const weekStart = weekStartOf(
    /^\d{4}-\d{2}-\d{2}$/.test(params.semaine ?? "") ? params.semaine! : today,
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: plan }, { data: settings }, { data: goal }] =
    await Promise.all([
      supabase
        .from("meal_plans")
        .select("id")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .maybeSingle(),
      supabase
        .from("user_settings")
        .select(
          "shomer_shabbat, israel_calendar, mode, jewish_calendar_enabled",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("goals")
        .select("calorie_target")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle(),
    ]);

  const { data: slotRows } = plan
    ? await supabase
        .from("meal_plan_slots")
        .select("*")
        .eq("plan_id", plan.id)
        .order("date")
    : { data: [] };

  const recipeIds = [
    ...new Set(
      (slotRows ?? [])
        .map((row) => row.recipe_id)
        .filter((id): id is string => id !== null),
    ),
  ];
  const { data: slugRows } =
    recipeIds.length > 0
      ? await supabase.from("recipes").select("id, slug").in("id", recipeIds)
      : { data: [] };
  const slugById = new Map((slugRows ?? []).map((r) => [r.id, r.slug]));

  const slots: GridSlot[] = (slotRows ?? []).map((row) => ({
    id: row.id,
    date: row.date,
    meal: row.meal as PlanMeal,
    title: row.title,
    icon: row.icon,
    kashrutClass: (row.kashrut_class ?? null) as KashrutClass | null,
    isFish: row.is_fish,
    kcal: row.kcal,
    servings: row.servings,
    isLeftover: row.is_leftover,
    slug: row.recipe_id ? (slugById.get(row.recipe_id) ?? null) : null,
  }));

  const calendarEnabled = settings?.jewish_calendar_enabled ?? true;
  const calendar = await getCalendarDays(
    supabase,
    user.id,
    weekStart,
    addDays(weekStart, 6),
  );
  const days: GridDay[] = calendar.map((day, index) => ({
    date: day.date,
    label: dayLabel(day.date),
    hebrewDate: calendarEnabled ? day.hebrewDate : "",
    badges: calendarEnabled
      ? [...day.labels, ...(day.isFeast ? [t.budgetKiff] : [])]
      : [],
    candleTime: calendarEnabled ? day.candleTime : null,
    isFast: calendarEnabled && day.isFast,
    isChabbat: calendarEnabled && (index === 4 || index === 5),
  }));

  const calorieTarget =
    settings?.mode === "boutargue" ? null : (goal?.calorie_target ?? null);

  const weekLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${weekStart}T00:00:00Z`));

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {t.title}
        </h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <nav className="flex items-center gap-2">
            <Link
              href={`/planning?semaine=${addDays(weekStart, -7)}`}
              aria-label={t.prevWeek}
              className="rounded-full border bg-card p-1.5 shadow-soft"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </Link>
            <p className="font-display text-base font-extrabold">
              {t.weekOf} {weekLabel}
            </p>
            <Link
              href={`/planning?semaine=${addDays(weekStart, 7)}`}
              aria-label={t.nextWeek}
              className="rounded-full border bg-card p-1.5 shadow-soft"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </Link>
          </nav>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/planning/courses?semaine=${weekStart}`}>
              <ShoppingCart />
              {t.courses.linkLabel}
            </Link>
          </Button>
        </div>
      </header>

      <PlanningGrid
        weekStart={weekStart}
        days={days}
        slots={slots}
        calorieTarget={calorieTarget}
        shomerShabbat={calendarEnabled && (settings?.shomer_shabbat ?? true)}
      />
    </section>
  );
}
