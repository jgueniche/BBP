"use client";

import { ChevronLeft, ChevronRight, RotateCcw, Timer, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import { cn } from "@/lib/utils/cn";

const t = fr.recettes;

export type CookStep = {
  text: string;
  durationSec: number | null;
  section: string | null;
};

export type CookIngredient = {
  label: string;
  amount: string;
};

type TimerState = { remaining: number; running: boolean };

function formatTime(totalSec: number): string {
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${`${sec}`.padStart(2, "0")}`;
}

export function CookClient({
  slug,
  title,
  icon,
  steps,
  ingredients,
}: {
  slug: string;
  title: string;
  icon: string | null;
  steps: CookStep[];
  ingredients: CookIngredient[];
}) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [timers, setTimers] = useState<Map<number, TimerState>>(new Map());
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  // Keep the screen awake while cooking (best effort).
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
        // Wake lock unavailable (browser or battery saver) — cook on.
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

  // One ticking interval drives every running timer, even off-screen ones.
  useEffect(() => {
    const anyRunning = [...timers.values()].some(
      (timer) => timer.running && timer.remaining > 0,
    );
    if (!anyRunning) return;
    const interval = setInterval(() => {
      setTimers((prev) => {
        const next = new Map(prev);
        for (const [stepIndex, timer] of next) {
          if (!timer.running || timer.remaining <= 0) continue;
          const remaining = timer.remaining - 1;
          next.set(stepIndex, { remaining, running: remaining > 0 });
          if (remaining === 0) {
            toast(`${t.cook.step} ${stepIndex + 1} — ${t.cook.timerDone}`);
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timers]);

  const step = steps[index];
  const timer = timers.get(index);
  const runningElsewhere = [...timers.entries()].filter(
    ([stepIndex, state]) => state.running && stepIndex !== index,
  );

  function startTimer() {
    if (!step?.durationSec) return;
    setTimers((prev) => {
      const next = new Map(prev);
      const current = next.get(index);
      next.set(index, {
        remaining: current?.remaining ?? step.durationSec!,
        running: true,
      });
      return next;
    });
  }

  function resetTimer() {
    if (!step?.durationSec) return;
    setTimers((prev) => {
      const next = new Map(prev);
      next.set(index, { remaining: step.durationSec!, running: false });
      return next;
    });
  }

  const progress = done ? 1 : index / Math.max(steps.length, 1);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      <header className="flex items-center gap-3 border-b-2 border-ink px-4 py-3">
        <Link
          href={`/recettes/${slug}`}
          aria-label={t.cook.exit}
          className="rounded-full border-2 border-ink p-1.5 shadow-sticker-sm"
        >
          <X size={16} strokeWidth={2} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-extrabold">
            {icon ? `${icon} ` : ""}
            {title}
          </p>
          <p className="font-mono text-[11px] text-ink-50">
            {done ? t.cook.done : `${t.cook.step} ${index + 1}/${steps.length}`}
          </p>
        </div>
        {runningElsewhere.length > 0 && (
          <div className="flex flex-col items-end gap-0.5">
            {runningElsewhere.slice(0, 2).map(([stepIndex, state]) => (
              <button
                key={stepIndex}
                type="button"
                onClick={() => {
                  setDone(false);
                  setIndex(stepIndex);
                }}
                className="flex items-center gap-1 rounded-full bg-ink-10 px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-70"
              >
                <Timer size={11} strokeWidth={2} aria-hidden />
                {stepIndex + 1} · {formatTime(state.remaining)}
              </button>
            ))}
          </div>
        )}
      </header>

      <div
        className="h-1.5 bg-boutargue transition-all"
        style={{ width: `${Math.round(progress * 100)}%` }}
        aria-hidden
      />

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
        {done ? (
          <div className="m-auto flex flex-col items-center gap-4 text-center">
            <span className="text-6xl" aria-hidden>
              {icon ?? "🎉"}
            </span>
            <p className="font-display text-2xl font-extrabold">
              {t.cook.done}
            </p>
            <Button asChild>
              <Link href={`/recettes/${slug}`}>{t.cook.exit}</Link>
            </Button>
          </div>
        ) : (
          <>
            {step.section && (
              <p className="text-xs font-bold uppercase tracking-wide text-ink-50">
                {step.section}
              </p>
            )}
            <p className="font-display text-2xl font-bold leading-snug">
              {step.text}
            </p>

            {step.durationSec !== null && (
              <div className="flex items-center gap-3 rounded-[20px] border-2 border-ink bg-paper p-4 shadow-sticker-sm">
                <Timer size={22} strokeWidth={2} aria-hidden />
                <p className="flex-1 font-mono text-3xl font-bold tabular-nums">
                  {formatTime(timer?.remaining ?? step.durationSec)}
                </p>
                {timer?.running ? (
                  <span className="text-xs font-semibold text-ink-50">
                    {t.cook.timerRunning}
                  </span>
                ) : (
                  <Button size="sm" onClick={startTimer}>
                    {t.cook.timerStart}
                  </Button>
                )}
                <button
                  type="button"
                  onClick={resetTimer}
                  aria-label={t.cook.timerReset}
                  className="rounded-full p-1.5 text-ink-50 hover:bg-ink-10"
                >
                  <RotateCcw size={16} strokeWidth={2} />
                </button>
              </div>
            )}

            <details className="mt-auto rounded-[16px] border-2 border-ink-10 px-3 py-2">
              <summary className="cursor-pointer text-sm font-bold">
                {t.cook.ingredients}
              </summary>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {ingredients.map((ingredient, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{ingredient.label}</span>
                    <span className="shrink-0 font-mono text-xs text-ink-50">
                      {ingredient.amount}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
      </main>

      {!done && (
        <footer className="flex gap-2 border-t-2 border-ink px-4 py-3">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft />
            {t.cook.prev}
          </Button>
          <Button
            className={cn("flex-1")}
            onClick={() => {
              if (index >= steps.length - 1) setDone(true);
              else setIndex((i) => i + 1);
            }}
          >
            {t.cook.next}
            <ChevronRight />
          </Button>
        </footer>
      )}
    </div>
  );
}
