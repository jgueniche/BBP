"use client";

import { useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fr } from "@/i18n/fr";
import type { TrendPoint } from "@/lib/nutrition/ewma";
import type { PlannedPoint } from "@/lib/nutrition/goal-plan";
import { cn } from "@/lib/utils/cn";

const t = fr.poids;

const PERIODS = [30, 90, 365] as const;
type Period = (typeof PERIODS)[number];

const MS_PER_DAY = 86_400_000;

type ChartRow = {
  date: string;
  ts: number;
  weight_kg: number | null;
  trend_kg: number | null;
  planned_kg: number | null;
};

function toTs(date: string): number {
  return new Date(`${date}T12:00:00Z`).getTime();
}

function formatTick(ts: number, period: Period): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: period === 30 ? "numeric" : undefined,
    month: "short",
  }).format(new Date(ts));
}

/** One row per date, actual and planned series merged on a real time axis. */
function mergeRows(points: TrendPoint[], plan: PlannedPoint[]): ChartRow[] {
  const byDate = new Map<string, ChartRow>();
  for (const p of points) {
    byDate.set(p.date, {
      date: p.date,
      ts: toTs(p.date),
      weight_kg: p.weight_kg,
      trend_kg: p.trend_kg,
      planned_kg: null,
    });
  }
  for (const p of plan) {
    const row = byDate.get(p.date);
    if (row) {
      row.planned_kg = p.planned_kg;
    } else {
      byDate.set(p.date, {
        date: p.date,
        ts: toTs(p.date),
        weight_kg: null,
        trend_kg: null,
        planned_kg: p.planned_kg,
      });
    }
  }
  return [...byDate.values()].sort((a, b) => a.ts - b.ts);
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]!.payload;
  return (
    <div className="rounded-[10px] border bg-card px-3 py-2 text-xs shadow-soft">
      <p className="font-semibold first-letter:uppercase">
        {new Intl.DateTimeFormat("fr-FR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }).format(new Date(`${row.date}T12:00:00Z`))}
      </p>
      {row.weight_kg !== null && (
        <p className="mt-1 font-mono">
          {t.chartWeight} : {row.weight_kg.toLocaleString("fr-FR")} kg
        </p>
      )}
      {row.trend_kg !== null && (
        <p className="font-mono text-[color:var(--chart-trend)]">
          {t.chartTrend} : {row.trend_kg.toLocaleString("fr-FR")} kg
        </p>
      )}
      {row.planned_kg !== null && (
        <p className="font-mono text-ink-50">
          {t.chartPlanned} : {row.planned_kg.toLocaleString("fr-FR")} kg
        </p>
      )}
    </div>
  );
}

export function WeightChart({
  points,
  plan = [],
}: {
  points: TrendPoint[];
  plan?: PlannedPoint[];
}) {
  const [period, setPeriod] = useState<Period>(30);

  // Window: `period` days back, and (when a plan is drawn) up to the same
  // span forward so the target line reads without dwarfing the recent data.
  const now = Date.now();
  const cutoff = new Date(now - period * MS_PER_DAY).toISOString().slice(0, 10);
  const horizon = new Date(now + period * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
  const rows = mergeRows(
    points.filter((p) => p.date >= cutoff),
    plan.filter((p) => p.date >= cutoff && p.date <= horizon),
  );
  const hasPlan = rows.some((r) => r.planned_kg !== null);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2" role="group" aria-label="Période">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                period === p ? "border-ink bg-boutargue-tint" : "bg-card",
              )}
              aria-pressed={period === p}
            >
              {t.periods[`${p}`]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-ink-50">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-ink-50" aria-hidden />
            {t.chartWeight}
          </span>
          <span className="flex items-center gap-1">
            <span
              className="h-0.5 w-4 rounded-full bg-[var(--chart-trend)]"
              aria-hidden
            />
            {t.chartTrend}
          </span>
          {hasPlan && (
            <span className="flex items-center gap-1">
              <span
                className="w-4 border-t-2 border-dashed border-ink-50"
                aria-hidden
              />
              {t.chartPlanned}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={rows}
            margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
          >
            <CartesianGrid stroke="var(--ink-10)" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(ts: number) => formatTick(ts, period)}
              tick={{ fill: "var(--ink-50)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--ink-10)" }}
              minTickGap={32}
            />
            <YAxis
              domain={["dataMin - 0.5", "dataMax + 0.5"]}
              tick={{ fill: "var(--ink-50)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => v.toLocaleString("fr-FR")}
              width={48}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "var(--ink-30)" }}
            />
            {hasPlan && (
              <Line
                type="monotone"
                dataKey="planned_kg"
                stroke="var(--ink-50)"
                strokeWidth={2}
                strokeDasharray="6 5"
                dot={false}
                activeDot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
            <Scatter dataKey="weight_kg" fill="var(--ink-50)" r={2.5} />
            <Line
              type="monotone"
              dataKey="trend_kg"
              stroke="var(--chart-trend)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 4,
                fill: "var(--chart-trend)",
                stroke: "var(--paper)",
              }}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
