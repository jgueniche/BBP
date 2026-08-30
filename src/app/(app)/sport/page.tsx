import { ChevronRight, Dumbbell, Flame, Trophy } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import type { ProgramWeek } from "@/lib/workout/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { GenerateProgramDialog } from "./generate-dialog";
import { QuickLog } from "./quick-log";

const t = fr.sport;

type PerformedExercise = {
  name: string;
  sets: Array<{ reps: number; weightKg: number | null; done: boolean }>;
};

export default async function SportPage() {
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const weekAgo = new Date(Date.now() - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const [{ data: program }, { data: sessions }, { data: weekSessions }] =
    await Promise.all([
      supabase
        .from("workout_programs")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("workout_sessions")
        .select("id, kind, label, date, duration_min, kcal_est, rpe, performed")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("workout_sessions")
        .select("kcal_est")
        .eq("user_id", user.id)
        .gte("date", weekAgo),
    ]);

  const weeklyKcal = (weekSessions ?? []).reduce(
    (sum, session) => sum + (session.kcal_est ?? 0),
    0,
  );

  // Personal records: heaviest logged weight per exercise name.
  const records = new Map<string, number>();
  for (const session of sessions ?? []) {
    const performed = (session.performed ?? null) as PerformedExercise[] | null;
    for (const exercise of performed ?? []) {
      for (const set of exercise.sets) {
        if (set.done && set.weightKg !== null && set.weightKg > 0) {
          const current = records.get(exercise.name) ?? 0;
          if (set.weightKg > current) records.set(exercise.name, set.weightKg);
        }
      }
    }
  }
  const topRecords = [...records.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const weeks = ((program?.weeks ?? []) as ProgramWeek[]).slice(0, 4);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {t.title}
        </h1>
        <div className="ml-auto">
          <GenerateProgramDialog hasProgram={program !== null} />
        </div>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          {program === null ? (
            <div className="rounded-lg border bg-card p-5 text-center shadow-soft">
              <Dumbbell
                size={32}
                strokeWidth={2}
                className="mx-auto text-ink-50"
                aria-hidden
              />
              <p className="mt-2 text-sm text-ink-70">{t.empty}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-soft">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="primary">
                  {t.goals[program.goal as keyof typeof t.goals]}
                </Badge>
                <Badge>{t.levels[program.level as keyof typeof t.levels]}</Badge>
                <Badge>
                  {t.equipments[program.equipment as keyof typeof t.equipments]}
                </Badge>
                <span className="text-xs text-ink-50">
                  {program.days_per_week}×/sem ·{" "}
                  {program.generated_by === "ai"
                    ? t.programBadgeAi
                    : t.programBadgeFallback}
                </span>
              </div>

              {weeks.map((week) => (
                <details key={week.week} open={week.week === 1}>
                  <summary className="cursor-pointer py-1 font-display text-base font-extrabold">
                    {t.week} {week.week}
                    {week.note && (
                      <span className="ml-2 text-xs font-medium normal-case text-ink-50">
                        {week.note}
                      </span>
                    )}
                  </summary>
                  <ul className="mb-1 flex flex-col gap-1.5">
                    {week.days.map((day) => (
                      <li
                        key={day.day}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold">
                            {day.title}
                          </span>
                          <span className="text-xs text-ink-50">
                            {day.exercises.length}{" "}
                            {t.seance.exercise.toLowerCase()}
                            {day.exercises.length > 1 ? "s" : ""}
                          </span>
                        </span>
                        <Button asChild size="sm" variant="secondary">
                          <Link
                            href={`/sport/seance?semaine=${week.week}&jour=${day.day}`}
                          >
                            {t.start}
                            <ChevronRight />
                          </Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {weeklyKcal > 0 && (
            <p className="flex items-center gap-1.5 text-sm text-ink-70">
              <Flame size={15} strokeWidth={2} aria-hidden />
              <span className="font-mono font-semibold">{weeklyKcal}</span>
              {t.weeklyKcal}
            </p>
          )}

          <QuickLog />

          {topRecords.length > 0 && (
            <div className="rounded-lg border bg-card p-4 shadow-soft">
              <h2 className="flex items-center gap-1.5 font-display text-base font-extrabold">
                <Trophy size={16} strokeWidth={2} aria-hidden />
                {t.records}
              </h2>
              <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {topRecords.map(([name, weight]) => (
                  <li key={name} className="rounded-lg border px-3 py-2">
                    <p className="truncate text-xs text-ink-50">{name}</p>
                    <p className="font-mono text-base font-bold">{weight} kg</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="font-display text-lg font-extrabold">{t.history}</h2>
            {(sessions ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-ink-50">{t.historyEmpty}</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {(sessions ?? []).slice(0, 10).map((session) => (
                  <li
                    key={session.id}
                    className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {session.label ?? t.title}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-ink-50">
                      {new Intl.DateTimeFormat("fr-FR", {
                        day: "numeric",
                        month: "short",
                      }).format(new Date(`${session.date}T00:00:00`))}
                      {session.duration_min !== null &&
                        ` · ${session.duration_min} min`}
                      {session.kcal_est !== null &&
                        ` · ${session.kcal_est} kcal`}
                      {session.rpe !== null && ` · RPE ${session.rpe}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-ink-50">{t.disclaimer}</p>
    </section>
  );
}
