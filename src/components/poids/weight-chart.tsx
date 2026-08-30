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
import { cn } from "@/lib/utils/cn";

const t = fr.poids;

const PERIODS = [30, 90, 365] as const;
type Period = (typeof PERIODS)[number];

function formatTick(date: string, period: Period): string {
  const d = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", {
    day: period === 30 ? "numeric" : undefined,
    month: "short",
  }).format(d);
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: TrendPoint }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0 || !label) return null;
  const point = payload[0]!.payload;
  return (
    <div className="rounded-[12px] border-2 border-ink bg-paper px-3 py-2 text-xs shadow-sticker-sm">
      <p className="font-semibold first-letter:uppercase">
        {new Intl.DateTimeFormat("fr-FR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }).format(new Date(`${point.date}T12:00:00Z`))}
      </p>
      <p className="mt-1 font-mono">
        {t.chartWeight} : {point.weight_kg.toLocaleString("fr-FR")} kg
      </p>
      <p className="font-mono text-[color:var(--chart-trend)]">
        {t.chartTrend} : {point.trend_kg.toLocaleString("fr-FR")} kg
      </p>
    </div>
  );
}

export function WeightChart({ points }: { points: TrendPoint[] }) {
  const [period, setPeriod] = useState<Period>(30);

  const cutoff = new Date(Date.now() - period * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const visible = points.filter((p) => p.date >= cutoff);

  return (
    <section>
      <div className="flex items-center justify-between">
        <div className="flex gap-2" role="group" aria-label="Période">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-full border-2 border-ink px-3 py-1 text-xs font-semibold",
                period === p ? "bg-boutargue-soft" : "bg-paper",
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
        </div>
      </div>

      <div className="mt-3 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={visible}
            margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
          >
            <CartesianGrid stroke="var(--ink-10)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => formatTick(d, period)}
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
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
