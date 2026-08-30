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
import {
  computeTrend,
  projectTargetDate,
  weeklyTrendChange,
} from "@/lib/nutrition/ewma";
import { maybeGenerateTdeeProposal } from "@/lib/nutrition/proposals";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const t = fr.poids;

function parisToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(
    new Date(),
  );
}

export default async function PoidsPage() {
  if (!isSupabaseConfigured) {
    return (
      <section>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
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

  await maybeGenerateTdeeProposal(supabase, user.id);

  const since = new Date(Date.now() - 366 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [weightsRes, goalRes, proposalRes, measuresRes] = await Promise.all([
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

  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        {t.title}
      </h1>

      <WeightEntry date={parisToday()} />

      {proposalRes.data && (
        <ProposalCard proposal={proposalRes.data as ProposalView} />
      )}

      {trendPoints.length === 0 ? (
        <EmptyState
          illustration={<KemiaAvatar expression="clin" size={64} />}
          title={t.empty}
          hint={t.emptyHint}
        />
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-[16px] border-2 border-ink bg-paper p-3">
              <dt className="text-xs text-ink-50">{t.trendNow}</dt>
              <dd className="mt-1 font-mono text-lg font-semibold">
                {last!.trend_kg.toLocaleString("fr-FR")} {t.kg}
              </dd>
            </div>
            <div className="rounded-[16px] border-2 border-ink bg-paper p-3">
              <dt className="text-xs text-ink-50">{t.weeklyChange}</dt>
              <dd className="mt-1 font-mono text-lg font-semibold">
                {weeklyChange === null
                  ? t.projectionNone
                  : `${weeklyChange > 0 ? "+" : ""}${weeklyChange.toLocaleString("fr-FR")} ${t.kg}`}
              </dd>
            </div>
            <div className="rounded-[16px] border-2 border-ink bg-paper p-3">
              <dt className="text-xs text-ink-50">{t.projection}</dt>
              <dd className="mt-1 font-mono text-lg font-semibold">
                {projection
                  ? new Intl.DateTimeFormat("fr-FR", {
                      month: "short",
                      year: "2-digit",
                    }).format(projection)
                  : t.projectionNone}
              </dd>
            </div>
          </dl>

          <WeightChart points={trendPoints} />
        </>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-extrabold">
          {t.measuresTitle}
        </h2>
        {lastMeasures && (
          <p className="text-xs text-ink-50">
            {t.lastMeasures.replace(
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
                  `${t.measures[k].replace(" (cm)", "")} ${v!.toLocaleString("fr-FR")} cm`,
              )
              .join(" · ")}
          </p>
        )}
        <MeasurementsForm date={parisToday()} />
      </section>

      <PhotosSection userId={user.id} />
    </section>
  );
}
