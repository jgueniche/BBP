"use client";

import {
  BookOpenCheck,
  Dices,
  Flame,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  addDayToJournal,
  clearSlot,
  generateWeek,
  moveSlot,
  regenerateSlot,
  searchPlannerRecipes,
  setSlotRecipe,
  type PlannerRecipeCandidate,
} from "@/app/(app)/planning/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { KashrutPill } from "@/components/ui/kashrut-pill";
import { fr } from "@/i18n/fr";
import type { KashrutClass } from "@/lib/kashrut/meal";
import type { PlanMeal } from "@/lib/planning/types";
import { cn } from "@/lib/utils/cn";

const t = fr.planning;

export type GridSlot = {
  id: string;
  date: string;
  meal: PlanMeal;
  title: string;
  icon: string | null;
  kashrutClass: KashrutClass | null;
  isFish: boolean;
  kcal: number | null;
  servings: number;
  isLeftover: boolean;
  slug: string | null;
};

export type GridDay = {
  date: string;
  label: string; // "lundi 7 sept."
  hebrewDate: string;
  badges: string[];
  candleTime: string | null;
  isFast: boolean;
  isChabbat: boolean; // Friday or Saturday
};

const MEALS: PlanMeal[] = ["petit_dej", "dej", "diner"];

function mealLabel(day: GridDay, meal: PlanMeal, shomer: boolean): string {
  if (!shomer) return t.meals[meal];
  const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
  if (meal === "diner" && weekday === 5) return t.chabbatDinner;
  if (meal === "dej" && weekday === 6) return t.chabbatLunch;
  return t.meals[meal];
}

export function PlanningGrid({
  weekStart,
  days,
  slots,
  calorieTarget,
  shomerShabbat,
}: {
  weekStart: string;
  days: GridDay[];
  slots: GridSlot[];
  calorieTarget: number | null;
  shomerShabbat: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [constraints, setConstraints] = useState("");
  const [picker, setPicker] = useState<{ date: string; meal: PlanMeal } | null>(
    null,
  );
  const [pickerQuery, setPickerQuery] = useState("");
  const [candidates, setCandidates] = useState<PlannerRecipeCandidate[]>([]);
  const dragged = useRef<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slotAt = (date: string, meal: PlanMeal) =>
    slots.find((slot) => slot.date === date && slot.meal === meal);

  async function onGenerate() {
    setBusy(true);
    toast(t.generating);
    try {
      const result = await generateWeek(weekStart, constraints);
      if (!result.ok) {
        toast(result.code === "quota" ? t.generateQuota : t.generateFailedPool);
        return;
      }
      toast(result.source === "ai" ? t.generated : t.generatedFallback);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onRegenerateSlot(slotId: string) {
    setBusy(true);
    try {
      const result = await regenerateSlot(slotId);
      toast(result.ok ? t.regenerated : t.regenerateFailed);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onClear(slotId: string) {
    setBusy(true);
    try {
      await clearSlot(slotId);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onDrop(date: string, meal: PlanMeal) {
    const slotId = dragged.current;
    dragged.current = null;
    if (!slotId) return;
    const result = await moveSlot({ slotId, toDate: date, toMeal: meal });
    if (!result.ok && result.violations.length > 0) {
      toast(`${t.blocked} ${result.violations[0]}`);
      return;
    }
    if (result.ok) {
      toast(t.moved);
      router.refresh();
    }
  }

  function onPickerSearch(value: string) {
    setPickerQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 2) {
      setCandidates([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setCandidates(await searchPlannerRecipes(value));
    }, 300);
  }

  async function onPick(candidate: PlannerRecipeCandidate) {
    if (!picker) return;
    const result = await setSlotRecipe({
      weekStart,
      date: picker.date,
      meal: picker.meal,
      recipeId: candidate.id,
    });
    if (!result.ok && result.violations.length > 0) {
      toast(`${t.blocked} ${result.violations[0]}`);
      return;
    }
    setPicker(null);
    setPickerQuery("");
    setCandidates([]);
    router.refresh();
  }

  async function onAddDay(date: string) {
    const result = await addDayToJournal(date);
    toast(result.added > 0 ? t.addedToJournal : t.nothingToAdd);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-soft">
        <div className="flex gap-2">
          <Input
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder={t.constraintsPlaceholder}
          />
          <Button onClick={onGenerate} disabled={busy}>
            <Sparkles />
            {t.generate}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {days.map((day) => {
          const daySlots = MEALS.map((meal) => ({
            meal,
            slot: slotAt(day.date, meal),
          }));
          const kcalPlanned = daySlots.reduce(
            (sum, { slot }) =>
              sum +
              (slot?.kcal === null || !slot ? 0 : slot.kcal * slot.servings),
            0,
          );
          return (
            <section
              key={day.date}
              className={cn(
                "rounded-lg border bg-card p-3 shadow-soft",
                day.isChabbat && "bg-boutargue-tint",
              )}
            >
              <header className="flex flex-wrap items-baseline justify-between gap-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 className="font-display text-base font-extrabold capitalize">
                    {day.label}
                  </h2>
                  <span className="text-[11px] text-ink-50">
                    {day.hebrewDate}
                  </span>
                  {day.candleTime && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-ink-10 px-1.5 py-0.5 text-[11px] font-semibold text-ink-70">
                      <Flame size={11} strokeWidth={2} aria-hidden />
                      {t.candles} {day.candleTime}
                    </span>
                  )}
                  {day.badges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full bg-ink-10 px-1.5 py-0.5 text-[11px] font-semibold text-ink-70"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {kcalPlanned > 0 && (
                    <span className="font-mono text-[11px] text-ink-50">
                      {Math.round(kcalPlanned)} kcal {t.plannedKcal}
                      {calorieTarget !== null &&
                        ` · ${t.target} ${calorieTarget}`}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onAddDay(day.date)}
                    aria-label={`${t.addDayToJournal} — ${day.label}`}
                    className="rounded-full border bg-card p-1 shadow-soft"
                    title={t.addDayToJournal}
                  >
                    <BookOpenCheck size={13} strokeWidth={2} />
                  </button>
                </div>
              </header>

              <div className="mt-2 flex flex-col gap-1.5">
                {daySlots.map(({ meal, slot }) => (
                  <div
                    key={meal}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => void onDrop(day.date, meal)}
                    className="flex items-center gap-2"
                  >
                    <span className="w-24 shrink-0 text-[11px] font-bold uppercase tracking-wide text-ink-50">
                      {mealLabel(day, meal, shomerShabbat)}
                    </span>
                    {slot ? (
                      <div
                        draggable
                        onDragStart={() => {
                          dragged.current = slot.id;
                        }}
                        className="flex min-w-0 flex-1 cursor-grab items-center gap-2 rounded-lg border bg-card px-2 py-1.5 active:cursor-grabbing"
                      >
                        {slot.icon && (
                          <span className="text-lg leading-none" aria-hidden>
                            {slot.icon}
                          </span>
                        )}
                        {slot.slug ? (
                          <Link
                            href={`/recettes/${slot.slug}`}
                            className="min-w-0 flex-1 truncate text-sm font-semibold"
                          >
                            {slot.title}
                          </Link>
                        ) : (
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                            {slot.title}
                          </span>
                        )}
                        {slot.isLeftover && (
                          <span className="rounded-full bg-ink-10 px-1.5 py-0.5 text-[10px] font-semibold text-ink-70">
                            {t.leftover}
                          </span>
                        )}
                        {slot.kashrutClass && (
                          <KashrutPill
                            kind={slot.kashrutClass}
                            isFish={slot.isFish}
                            className="scale-75"
                          />
                        )}
                        {slot.kcal !== null && (
                          <span className="shrink-0 font-mono text-[11px] text-ink-50">
                            {Math.round(slot.kcal * slot.servings)} kcal
                            {slot.servings !== 1 &&
                              ` · ${slot.servings} ${t.portions}`}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => onRegenerateSlot(slot.id)}
                          disabled={busy}
                          aria-label={t.regenerateSlot}
                          className="rounded-full p-1 text-ink-50 hover:bg-ink-10"
                        >
                          <Dices size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPicker({ date: day.date, meal })}
                          aria-label={t.swap}
                          className="rounded-full p-1 text-ink-50 hover:bg-ink-10"
                        >
                          <RefreshCw size={13} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onClear(slot.id)}
                          disabled={busy}
                          aria-label={t.remove}
                          className="rounded-full p-1 text-ink-50 hover:bg-ink-10"
                        >
                          <X size={14} strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPicker({ date: day.date, meal })}
                        className="flex flex-1 items-center gap-1 rounded-lg border border-dashed border-ink-30/70 px-2 py-1.5 text-left text-sm text-ink-50 hover:border-ink"
                      >
                        <Plus size={14} strokeWidth={2} aria-hidden />
                        {t.emptySlot}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Dialog
        open={picker !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPicker(null);
            setPickerQuery("");
            setCandidates([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.pickerTitle}</DialogTitle>
          </DialogHeader>
          <Input
            value={pickerQuery}
            onChange={(e) => onPickerSearch(e.target.value)}
            placeholder={t.pickerSearch}
            autoFocus
          />
          {candidates.length === 0 && pickerQuery.trim().length >= 2 ? (
            <p className="text-sm text-ink-50">{t.pickerEmpty}</p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
              {candidates.map((candidate) => (
                <li key={candidate.id}>
                  <button
                    type="button"
                    onClick={() => onPick(candidate)}
                    className="flex w-full items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left text-sm font-semibold hover:border-ink"
                  >
                    {candidate.icon && (
                      <span className="text-lg leading-none" aria-hidden>
                        {candidate.icon}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {candidate.title}
                    </span>
                    {candidate.kashrutClass && (
                      <KashrutPill
                        kind={candidate.kashrutClass}
                        className="scale-75"
                      />
                    )}
                    {candidate.kcal !== null && (
                      <span className="shrink-0 font-mono text-[11px] text-ink-50">
                        {Math.round(candidate.kcal)} kcal
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
