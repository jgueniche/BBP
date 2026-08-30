import { BookOpen, Dumbbell, Flame, Scale, Star } from "lucide-react";
import { redirect } from "next/navigation";

import { ChallengeButton } from "./challenge-button";

import { KemiaAvatar } from "@/components/illustrations/kemia-avatar";
import { MeasurementsForm } from "@/components/poids/measurements-form";
import { PhotosSection } from "@/components/poids/photos-section";
import {
  ProposalCard,
  type ProposalView,
} from "@/components/poids/proposal-card";
import { WeightChart } from "@/components/poids/weight-chart";
import { WeightEntry } from "@/components/poids/weight-entry";
import { EmptyState } from "@/components/ui/empty-state";
import { fr } from "@/i18n/fr";
import { evaluateGamification } from "@/lib/gamification/evaluate";
import {
  computeTrend,
  projectTargetDate,
  weeklyTrendChange,
} from "@/lib/nutrition/ewma";
import { maybeGenerateTdeeProposal } from "@/lib/nutrition/proposals";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

const t = fr.progres;
const tp = fr.poids;

const STREAK_META = [
  { kind: "journal" as const, label: t.streaks.journal, Icon: BookOpen },
  { kind: "sport" as const, label: t.streaks.sport, Icon: Dumbbell },
  { kind: "pesee" as const, label: t.streaks.pesee, Icon: Scale },
];

function parisToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(
    new Date(),
  );
}

export default async function ProgresPage() {
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
  if (!user) redirect("/login");

  await maybeGenerateTdeeProposal(supabase, user.id);

  const since = new Date(Date.now() - 366 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [
    weightsRes,
    goalRes,
    proposalRes,
    measuresRes,
    summary,
    { data: badges },
    { data: myBadges },
    { data: challenges },
    { data: joined },
  ] = await Promise.all([
    supabase
      .from("weight_logs")
      .select("date, weight_kg")
      .eq("user_id", user.id)
      .gte("date", since)
      .order("date"),
    supabase
      .from("goals")
      .select("target_weight_kg")
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("tdee_proposals")
      .select(
        "id, new_tdee, new_calorie_target, avg_intake_kcal, trend_change_kg, days_with_logs",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("body_measurements")
      .select("date, waist_cm, hips_cm, chest_cm, arm_cm, thigh_cm")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    evaluateGamification(supabase, user.id),
    supabase.from("badges").select("slug, name, description, icon"),
    supabase
      .from("user_badges")
      .select("badge_slug, awarded_at")
      .eq("user_id", user.id),
    supabase
      .from("challenges")
      .select("slug, name, description, icon, metric, target, collective")
      .order("created_at"),
    supabase
      .from("challenge_participants")
      .select("challenge_slug, progress")
      .eq("user_id", user.id),
  ]);

  const trendPoints = computeTrend(weightsRes.data ?? []);
  const last = trendPoints.at(-1) ?? null;
  const weeklyChange = weeklyTrendChange(trendPoints);
  const targetWeight = goalRes.data?.target_weight_kg ?? null;
  const projection =
    last && targetWeight !== null
      ? projectTargetDate(last.trend_kg, targetWeight, weeklyChange)
      : null;
  const lastMeasures = measuresRes.data;

  const earnedAt = new Map(
    (myBadges ?? []).map((b) => [b.badge_slug, b.awarded_at]),
  );
  const joinedBySlug = new Map(
    (joined ?? []).map((j) => [j.challenge_slug, j.progress]),
  );

  const collectiveTotals = new Map<
    string,
    { participants: number; total: number }
  >();
  await Promise.all(
    (challenges ?? [])
      .filter((c) => c.collective)
      .map(async (c) => {
        const { data } = await supabase.rpc("challenge_totals", {
          challenge: c.slug,
        });
        const parsed = (data ?? {}) as {
          participants?: number;
          total?: number;
        };
        collectiveTotals.set(c.slug, {
          participants: parsed.participants ?? 0,
          total: parsed.total ?? 0,
        });
      }),
  );

  const { level, xp } = summary;
  const xpProgress =
    level.nextMinXp === null
      ? 1
      : (xp - level.minXp) / (level.nextMinXp - level.minXp);
  const dayAgo = Date.now() - 86_400_000;

  return (
    <section className="flex flex-col gap-8">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        {t.title}
      </h1>

      {/* Weight tracking (formerly /poids), merged here by the redesign. */}
      <section className="flex flex-col gap-4">
        {trendPoints.length > 0 && (
          <dl className="grid grid-cols-3 gap-3 text-center sm:max-w-2xl">
            <div className="rounded-lg border bg-card p-3 shadow-soft">
              <dt className="text-xs text-ink-50">{tp.trendNow}</dt>
              <dd className="mt-1 font-mono text-lg font-semibold">
                {last!.trend_kg.toLocaleString("fr-FR")} {tp.kg}
              </dd>
            </div>
            <div className="rounded-lg border bg-card p-3 shadow-soft">
              <dt className="text-xs text-ink-50">{tp.weeklyChange}</dt>
              <dd
                className={cn(
                  "mt-1 font-mono text-lg font-semibold",
                  weeklyChange !== null && weeklyChange < 0 && "text-ok",
                )}
              >
                {weeklyChange === null
                  ? tp.projectionNone
                  : `${weeklyChange > 0 ? "+" : ""}${weeklyChange.toLocaleString("fr-FR")} ${tp.kg}`}
              </dd>
            </div>
            <div className="rounded-lg border bg-card p-3 shadow-soft">
              <dt className="text-xs text-ink-50">{tp.projection}</dt>
              <dd className="mt-1 font-mono text-lg font-semibold">
                {projection
                  ? new Intl.DateTimeFormat("fr-FR", {
                      month: "short",
                      year: "2-digit",
                    }).format(projection)
                  : tp.projectionNone}
              </dd>
            </div>
          </dl>
        )}

        <div className="grid items-start gap-4 xl:grid-cols-3">
          <div className="flex flex-col gap-4 xl:col-span-2">
            {trendPoints.length === 0 ? (
              <EmptyState
                illustration={<KemiaAvatar expression="clin" size={64} />}
                title={tp.empty}
                hint={tp.emptyHint}
              />
            ) : (
              <WeightChart points={trendPoints} />
            )}
          </div>
          <div className="flex flex-col gap-4">
            <WeightEntry date={parisToday()} />
            {proposalRes.data && (
              <ProposalCard proposal={proposalRes.data as ProposalView} />
            )}
          </div>
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-2">
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-extrabold">
              {tp.measuresTitle}
            </h2>
            {lastMeasures && (
              <p className="text-xs text-ink-50">
                {tp.lastMeasures.replace(
                  "{date}",
                  new Intl.DateTimeFormat("fr-FR", {
                    day: "numeric",
                    month: "short",
                  }).format(new Date(`${lastMeasures.date}T12:00:00Z`)),
                )}{" "}
                :{" "}
                {(
                  [
                    ["waist_cm", lastMeasures.waist_cm],
                    ["hips_cm", lastMeasures.hips_cm],
                    ["chest_cm", lastMeasures.chest_cm],
                    ["arm_cm", lastMeasures.arm_cm],
                    ["thigh_cm", lastMeasures.thigh_cm],
                  ] as const
                )
                  .filter(([, v]) => v !== null)
                  .map(
                    ([k, v]) =>
                      `${tp.measures[k].replace(" (cm)", "")} ${v!.toLocaleString("fr-FR")} cm`,
                  )
                  .join(" · ")}
              </p>
            )}
            <MeasurementsForm date={parisToday()} />
          </section>
          <PhotosSection userId={user.id} />
        </div>
      </section>

      {/* Level, streaks, badges and challenges. */}
      <section className="flex flex-col gap-4">
        <div className="rounded-lg border bg-card p-4 shadow-soft">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display text-lg font-extrabold">
              {t.levelLabel} {level.level} — {level.name}
            </p>
            <p className="font-mono text-sm text-ink-70">
              {xp} {t.xp}
            </p>
          </div>
          <div
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink-10"
            role="progressbar"
            aria-valuenow={Math.round(xpProgress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-boutargue"
              style={{ width: `${Math.round(Math.min(1, xpProgress) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-ink-50">
            {level.nextMinXp === null
              ? t.maxLevel
              : `${level.nextMinXp - xp} ${t.xp} → ${t.nextLevel} (${level.nextName})`}
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-extrabold">
            {t.streaks.title}
          </h2>
          <div className="mt-2 grid grid-cols-3 gap-3 sm:max-w-2xl">
            {STREAK_META.map(({ kind, label, Icon }) => {
              const streak = summary.streaks[kind];
              return (
                <div
                  key={kind}
                  className="rounded-lg border bg-card p-3 text-center shadow-soft"
                >
                  <Icon
                    size={16}
                    strokeWidth={2}
                    className="mx-auto text-ink-50"
                    aria-hidden
                  />
                  <p className="mt-1 flex items-center justify-center gap-1 font-mono text-2xl font-bold">
                    {streak.current > 0 && (
                      <Flame
                        size={18}
                        strokeWidth={2}
                        className="text-boutargue-deep"
                        aria-hidden
                      />
                    )}
                    {streak.current}
                    <span className="text-xs font-medium text-ink-50">
                      {t.streaks.days}
                    </span>
                  </p>
                  <p className="text-[11px] text-ink-50">
                    {label} · {t.streaks.best} {streak.best}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-ink-50">{t.streaks.tolerance}</p>
        </div>

        <div>
          <h2 className="font-display text-lg font-extrabold">
            {t.badges.title}
            <span className="ml-2 font-mono text-sm text-ink-50">
              {earnedAt.size}/{(badges ?? []).length} {t.badges.earnedLabel}
            </span>
          </h2>
          <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {(badges ?? []).map((badge) => {
              const awarded = earnedAt.get(badge.slug);
              const isNew =
                awarded !== undefined && new Date(awarded).getTime() > dayAgo;
              return (
                <li
                  key={badge.slug}
                  className={cn(
                    "rounded-lg border p-3",
                    awarded
                      ? "bg-card shadow-soft"
                      : "border-dashed bg-transparent opacity-60",
                  )}
                >
                  <p className="flex items-center gap-1.5">
                    <span className="text-2xl leading-none" aria-hidden>
                      {badge.icon}
                    </span>
                    {isNew && (
                      <span className="rounded-full bg-boutargue px-1.5 py-0.5 text-[10px] font-bold text-[#0b0b0b]">
                        {t.badges.newLabel}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm font-bold">{badge.name}</p>
                  <p className="text-[11px] leading-snug text-ink-50">
                    {badge.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h2 className="flex items-center gap-1.5 font-display text-lg font-extrabold">
            <Star size={18} strokeWidth={2} aria-hidden />
            {t.challenges.title}
          </h2>
          <ul className="mt-2 grid gap-3 xl:grid-cols-2">
            {(challenges ?? []).map((challenge) => {
              const myProgress = joinedBySlug.get(challenge.slug);
              const isJoined = myProgress !== undefined;
              const collective = collectiveTotals.get(challenge.slug);
              const shown = challenge.collective
                ? (collective?.total ?? 0)
                : (myProgress ?? 0);
              const ratio = Math.min(1, shown / challenge.target);
              return (
                <li
                  key={challenge.slug}
                  className="rounded-lg border bg-card p-3 shadow-soft"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-2xl leading-none" aria-hidden>
                      {challenge.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{challenge.name}</p>
                      <p className="text-xs text-ink-50">
                        {challenge.description}
                      </p>
                    </div>
                    <ChallengeButton slug={challenge.slug} joined={isJoined} />
                  </div>
                  {isJoined && (
                    <>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-10">
                        <div
                          className="h-full rounded-full bg-ok"
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-ink-50">
                        {challenge.collective
                          ? `${Math.round(shown)}/${challenge.target} (${t.challenges.collectiveLabel}, ${collective?.participants ?? 0} ${t.challenges.participantsLabel}) · ${t.challenges.youLabel} : ${Math.round(myProgress ?? 0)}`
                          : `${Math.round(shown)}/${challenge.target}`}
                      </p>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </section>
  );
}
