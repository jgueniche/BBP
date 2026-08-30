import { notFound, redirect } from "next/navigation";

import type { ProgramWeek } from "@/lib/workout/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { SeanceClient, type SeanceExercise } from "./seance-client";

export default async function SeancePage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string; jour?: string }>;
}) {
  const params = await searchParams;
  if (!isSupabaseConfigured) return null;

  const weekNumber = parseInt(params.semaine ?? "1", 10);
  const dayNumber = parseInt(params.jour ?? "1", 10);
  if (!Number.isFinite(weekNumber) || !Number.isFinite(dayNumber)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: program } = await supabase
    .from("workout_programs")
    .select("id, weeks")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!program) redirect("/sport");

  const weeks = (program.weeks ?? []) as ProgramWeek[];
  const week = weeks.find((w) => w.week === weekNumber);
  const day = week?.days.find((d) => d.day === dayNumber);
  if (!week || !day || day.exercises.length === 0) redirect("/sport");

  const exercises: SeanceExercise[] = day.exercises.map((exercise) => ({
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps,
    restSec: exercise.restSec,
    met: exercise.met,
    cues: exercise.cues,
  }));

  return (
    <SeanceClient
      programId={program.id}
      weekNumber={weekNumber}
      dayNumber={dayNumber}
      title={day.title}
      exercises={exercises}
    />
  );
}
