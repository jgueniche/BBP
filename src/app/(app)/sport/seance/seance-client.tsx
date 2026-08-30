"use client";

import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { completeSession } from "@/app/(app)/sport/actions";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import { cn } from "@/lib/utils/cn";

const t = fr.sport.seance;

export type SeanceExercise = {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  restSec: number;
  met: number;
  cues: string;
};

type SetState = { reps: number; weightKg: number | null; done: boolean };

function formatTime(totalSec: number): string {
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${`${sec}`.padStart(2, "0")}`;
}

export function SeanceClient({
  programId,
  weekNumber,
  dayNumber,
  title,
  exercises,
}: {
  programId: string;
  weekNumber: number;
  dayNumber: number;
  title: string;
  exercises: SeanceExercise[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"work" | "finish" | "done">("work");
  const [performed, setPerformed] = useState<SetState[][]>(() =>
    exercises.map((exercise) =>
      Array.from({ length: exercise.sets }, () => ({
        reps: exercise.reps,
        weightKg: null,
        done: false,
      })),
    ),
  );
  const [weights, setWeights] = useState<string[]>(() =>
    exercises.map(() => ""),
  );
  const [rest, setRest] = useState<number | null>(null);
  const [rpe, setRpe] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);
  const [kcal, setKcal] = useState<number | null>(null);
  const startedAt = useRef(Date.now());
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  // Screen stays on during the workout (best effort).
  useEffect(() => {
    let cancelled = false;
    async function acquire() {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: {
            request: (
              type: "screen",
            ) => Promise<{ release: () => Promise<void> }>;
          };
        };
        if (!nav.wakeLock) return;
        const lock = await nav.wakeLock.request("screen");
        if (cancelled) await lock.release();
        else wakeLock.current = lock;
      } catch {
        // Unsupported — keep training.
      }
    }
    void acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void wakeLock.current?.release();
    };
  }, []);

  // Rest countdown with a gentle vibration at zero (discreet by design).
  useEffect(() => {
    if (rest === null) return;
    if (rest <= 0) {
      try {
        navigator.vibrate?.(200);
      } catch {
        // No vibration support — the visual cue is enough.
      }
      setRest(null);
      return;
    }
    const timeout = setTimeout(
      () => setRest((r) => (r === null ? null : r - 1)),
      1000,
    );
    return () => clearTimeout(timeout);
  }, [rest]);

  const exercise = exercises[index];
  const sets = performed[index];
  const doneCount = performed.reduce(
    (sum, list) => sum + list.filter((s) => s.done).length,
    0,
  );
  const totalSets = performed.reduce((sum, list) => sum + list.length, 0);

  function toggleSet(setIndex: number) {
    const wasDone = sets[setIndex].done;
    const weight = parseFloat(weights[index].replace(",", "."));
    setPerformed((prev) =>
      prev.map((list, i) =>
        i === index
          ? list.map((set, j) =>
              j === setIndex
                ? {
                    ...set,
                    done: !wasDone,
                    weightKg: Number.isFinite(weight) ? weight : set.weightKg,
                  }
                : set,
            )
          : list,
      ),
    );
    if (!wasDone) setRest(exercise.restSec);
  }

  async function save() {
    setSaving(true);
    try {
      const durationMin = Math.max(
        1,
        Math.round((Date.now() - startedAt.current) / 60_000),
      );
      const result = await completeSession({
        programId,
        weekNumber,
        dayNumber,
        title,
        performed: exercises.map((ex, i) => ({
          exerciseId: ex.exerciseId,
          name: ex.name,
          met: ex.met,
          sets: performed[i],
        })),
        durationMin,
        rpe,
      });
      setKcal(result.kcal);
      setReaction(result.reaction);
      setPhase("done");
      toast(t.saved);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      <header className="flex items-center gap-3 border-b-2 border-ink px-4 py-3">
        <Link
          href="/sport"
          aria-label={t.exit}
          className="rounded-full border-2 border-ink p-1.5 shadow-sticker-sm"
        >
          <X size={16} strokeWidth={2} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-extrabold">
            {title}
          </p>
          <p className="font-mono text-[11px] text-ink-50">
            {doneCount}/{totalSets} {fr.sport.setsShort} ·{" "}
            {Math.round((Date.now() - startedAt.current) / 60_000)} {t.minutes}
          </p>
        </div>
      </header>

      <div
        className="h-1.5 bg-boutargue transition-all"
        style={{
          width: `${Math.round((doneCount / Math.max(totalSets, 1)) * 100)}%`,
        }}
        aria-hidden
      />

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5">
        {phase === "done" ? (
          <div className="m-auto flex flex-col items-center gap-4 px-4 text-center">
            <span className="text-6xl" aria-hidden>
              💪
            </span>
            <p className="font-display text-2xl font-extrabold">
              {t.doneTitle}
            </p>
            {kcal !== null && (
              <p className="font-mono text-sm text-ink-70">
                ~{kcal} {t.kcalLabel}
              </p>
            )}
            {reaction && (
              <p className="rounded-[20px] border-2 border-ink bg-boutargue-soft px-4 py-3 text-sm text-[#3d3d3d]">
                {reaction}
              </p>
            )}
            <Button asChild>
              <Link href="/sport">{t.exit}</Link>
            </Button>
          </div>
        ) : phase === "finish" ? (
          <div className="m-auto flex w-full max-w-sm flex-col gap-4">
            <p className="text-center font-display text-xl font-extrabold">
              {t.rpe}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRpe(value)}
                  aria-pressed={rpe === value}
                  className={cn(
                    "rounded-[14px] border-2 border-ink py-3 font-mono text-base font-bold",
                    rpe === value ? "bg-boutargue text-paper" : "bg-paper",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
            <Button onClick={save} disabled={saving} size="lg">
              {saving ? t.saving : t.save}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-50">
                {t.exercise} {index + 1}/{exercises.length}
              </p>
              <p className="font-mono text-xs text-ink-50">
                {exercise.sets} × {exercise.reps} · {fr.sport.restShort}{" "}
                {exercise.restSec}s
              </p>
            </div>
            <h2 className="font-display text-2xl font-bold leading-snug">
              {exercise.name}
            </h2>
            <p className="text-sm text-ink-70">{exercise.cues}</p>

            <label className="flex items-center gap-2 text-sm font-medium">
              {t.weightPlaceholder}
              <input
                inputMode="decimal"
                value={weights[index]}
                onChange={(e) =>
                  setWeights((prev) =>
                    prev.map((w, i) => (i === index ? e.target.value : w)),
                  )
                }
                placeholder="—"
                className="w-20 rounded-[12px] border-2 border-ink bg-paper px-2 py-2 text-right font-mono text-sm"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              {sets.map((set, setIndex) => (
                <button
                  key={setIndex}
                  type="button"
                  onClick={() => toggleSet(setIndex)}
                  aria-pressed={set.done}
                  aria-label={`${t.exercise} ${exercise.name} — série ${setIndex + 1}`}
                  className={cn(
                    "flex size-16 flex-col items-center justify-center rounded-full border-2 border-ink font-mono text-sm font-bold shadow-sticker-sm transition-all active:translate-y-[2px]",
                    set.done ? "bg-ok text-paper" : "bg-paper",
                  )}
                >
                  {set.done ? (
                    <Check size={20} strokeWidth={2.5} aria-hidden />
                  ) : (
                    <>
                      <span>{set.reps}</span>
                      <span className="text-[9px] font-medium">reps</span>
                    </>
                  )}
                </button>
              ))}
            </div>

            {rest !== null && (
              <div className="mt-auto flex items-center gap-3 rounded-[20px] border-2 border-ink bg-boutargue-soft p-4">
                <p className="text-sm font-bold text-[#0b0b0b]">
                  {t.restTitle}
                </p>
                <p className="flex-1 text-center font-mono text-4xl font-bold tabular-nums text-[#0b0b0b]">
                  {formatTime(rest)}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setRest(null)}
                >
                  {t.skipRest}
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {phase === "work" && (
        <footer className="flex gap-2 border-t-2 border-ink px-4 py-3">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            className="flex-[2]"
            size="lg"
            onClick={() => {
              setRest(null);
              if (index >= exercises.length - 1) setPhase("finish");
              else setIndex((i) => i + 1);
            }}
          >
            {index >= exercises.length - 1 ? t.finish : fr.recettes.cook.next}
            <ChevronRight />
          </Button>
        </footer>
      )}
    </div>
  );
}
