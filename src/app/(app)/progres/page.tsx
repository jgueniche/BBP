import { BookOpen, Dumbbell, Flame, Scale, Star } from "lucide-react";
import { redirect } from "next/navigation";

import { ChallengeButton } from "./challenge-button";

import { fr } from "@/i18n/fr";
import { evaluateGamification } from "@/lib/gamification/evaluate";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

const t = fr.progres;

const STREAK_META = [
  { kind: "journal" as const, label: t.streaks.journal, Icon: BookOpen },
  { kind: "sport" as const, label: t.streaks.sport, Icon: Dumbbell },
  { kind: "pesee" as const, label: t.streaks.pesee, Icon: Scale },
];

export default async function ProgresPage() {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const summary = await evaluateGamification(supabase, user.id);

  const [
    { data: badges },
    { data: myBadges },
    { data: challenges },
    { data: joined },
  ] = await Promise.all([
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
    <section className="flex flex-col gap-5">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        {t.title}
      </h1>

      <div className="rounded-[20px] border-2 border-ink bg-paper p-4 shadow-sticker">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-lg font-extrabold">
            {t.levelLabel} {level.level} — {level.name}
          </p>
          <p className="font-mono text-sm text-ink-70">
            {xp} {t.xp}
          </p>
        </div>
        <div
          className="mt-2 h-3 overflow-hidden rounded-full border-2 border-ink"
          role="progressbar"
          aria-valuenow={Math.round(xpProgress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-boutargue"
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
        <div className="mt-2 grid grid-cols-3 gap-2">
          {STREAK_META.map(({ kind, label, Icon }) => {
            const streak = summary.streaks[kind];
            return (
              <div
                key={kind}
                className="rounded-[16px] border-2 border-ink bg-paper p-3 text-center shadow-sticker-sm"
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
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(badges ?? []).map((badge) => {
            const awarded = earnedAt.get(badge.slug);
            const isNew =
              awarded !== undefined && new Date(awarded).getTime() > dayAgo;
            return (
              <li
                key={badge.slug}
                className={cn(
                  "rounded-[16px] border-2 p-3",
                  awarded
                    ? "border-ink bg-paper shadow-sticker-sm"
                    : "border-ink-10 bg-paper opacity-50",
                )}
              >
                <p className="flex items-center gap-1.5">
                  <span className="text-2xl leading-none" aria-hidden>
                    {badge.icon}
                  </span>
                  {isNew && (
                    <span className="rounded-full bg-boutargue px-1.5 py-0.5 text-[10px] font-bold text-paper">
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
        <ul className="mt-2 flex flex-col gap-2">
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
                className="rounded-[20px] border-2 border-ink bg-paper p-3 shadow-sticker-sm"
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
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full border-2 border-ink-10">
                      <div
                        className="h-full bg-ok"
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
  );
}
