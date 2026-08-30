"use client";

import { Target } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateTargetWeight } from "@/app/(app)/progres/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fr } from "@/i18n/fr";

const t = fr.progres.goal;

export type GoalCardView = {
  startKg: number;
  targetKg: number;
  currentKg: number | null;
  /** 0..1+, share of the planned change already achieved. */
  progressRatio: number | null;
  plannedWeeklyKg: number;
  actualWeeklyKg: number | null;
  plannedDate: string | null;
  estimatedDate: string | null;
  /** Signed kg vs the plan today (negative = lighter than planned). */
  gapKg: number | null;
  /** Loss plan (true) or gain plan — flips how the gap reads. */
  losing: boolean;
};

function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
}

function kg(value: number): string {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

function GapBadge({ gapKg, losing }: { gapKg: number; losing: boolean }) {
  // For a loss plan, being lighter than planned (gap < 0) is being ahead.
  const ahead = losing ? gapKg < -0.1 : gapKg > 0.1;
  const onPlan = Math.abs(gapKg) <= 0.1;
  if (onPlan) return <Badge variant="ok">{t.onPlan}</Badge>;
  if (ahead) {
    return (
      <Badge variant="ok">
        {t.aheadOfPlan.replace("{kg}", kg(Math.abs(gapKg)))}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      {t.behindPlan.replace("{kg}", kg(Math.abs(gapKg)))}
    </Badge>
  );
}

export function GoalCard({ view }: { view: GoalCardView }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(view.targetKg));
  const [pending, startTransition] = useTransition();

  function submit() {
    const value = Number(draft.replace(",", "."));
    if (!Number.isFinite(value)) {
      toast.error(t.targetInvalid);
      return;
    }
    startTransition(async () => {
      const result = await updateTargetWeight(value);
      if (result.ok) {
        toast.success(t.saved);
        setEditing(false);
      } else if (result.reason === "too_low") {
        toast.error(t.targetTooLow);
      } else if (result.reason === "invalid") {
        toast.error(t.targetInvalid);
      } else {
        toast.error(t.updateFailed);
      }
    });
  }

  const ratio = view.progressRatio;
  const pct = ratio === null ? null : Math.round(Math.min(1, ratio) * 100);
  const done =
    view.currentKg === null ? null : Math.abs(view.currentKg - view.startKg);
  const remaining =
    view.currentKg === null ? null : Math.abs(view.targetKg - view.currentKg);

  return (
    <section className="rounded-lg border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
          <Target size={18} strokeWidth={2} aria-hidden />
          {t.title}
        </h2>
        {view.gapKg !== null && (
          <GapBadge gapKg={view.gapKg} losing={view.losing} />
        )}
        {!editing && (
          <Button
            variant="secondary"
            size="sm"
            className="ml-auto"
            onClick={() => {
              setDraft(String(view.targetKg));
              setEditing(true);
            }}
          >
            {t.edit}
          </Button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="font-mono text-2xl font-semibold">
          <span className="text-ink-50">{kg(view.startKg)}</span>
          {view.currentKg !== null && (
            <>
              <span className="mx-2 text-ink-30">→</span>
              {kg(view.currentKg)}
            </>
          )}
          <span className="mx-2 text-ink-30">→</span>
          {editing ? (
            <span className="inline-flex items-center gap-2 align-middle">
              <Input
                type="number"
                step="0.5"
                inputMode="decimal"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                aria-label={t.targetLabel}
                className="w-24 font-mono"
              />
              <Button size="sm" onClick={submit} disabled={pending}>
                {t.save}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={pending}
              >
                {t.cancel}
              </Button>
            </span>
          ) : (
            <span className="text-boutargue-deep">{kg(view.targetKg)}</span>
          )}
          <span className="ml-1 text-sm font-medium text-ink-50">kg</span>
        </p>
        {view.currentKg !== null && done !== null && remaining !== null && (
          <p className="text-sm text-ink-70">
            {t.doneLabel}{" "}
            <span className="font-mono font-semibold text-ok">
              {kg(done)} kg
            </span>{" "}
            · {t.remainingLabel}{" "}
            <span className="font-mono font-semibold">{kg(remaining)} kg</span>
          </p>
        )}
      </div>

      {pct !== null && (
        <div className="mt-3">
          <div
            className="h-2.5 overflow-hidden rounded-full bg-ink-10"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-ok"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-ink-50">
            <span className="font-mono font-semibold text-ink-70">{pct} %</span>{" "}
            {t.progressOf}
          </p>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-ink-50">{t.plannedRate}</dt>
          <dd className="mt-0.5 font-mono font-semibold">
            {kg(view.plannedWeeklyKg)} {t.perWeek}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-50">{t.actualRate}</dt>
          <dd className="mt-0.5 font-mono font-semibold">
            {view.actualWeeklyKg === null
              ? "—"
              : `${kg(view.actualWeeklyKg)} ${t.perWeek}`}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-50">{t.plannedArrival}</dt>
          <dd className="mt-0.5 font-mono font-semibold">
            {view.plannedDate ? formatDateShort(view.plannedDate) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-50">{t.estimatedArrival}</dt>
          <dd className="mt-0.5 font-mono font-semibold">
            {view.estimatedDate ? formatDateShort(view.estimatedDate) : "—"}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs">
        <Link
          href="/profil"
          className="font-semibold text-boutargue-deep hover:underline"
        >
          {t.reviewPlan}
        </Link>
      </p>
    </section>
  );
}
