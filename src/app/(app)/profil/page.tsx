import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { signOut } from "./actions";
import { DeleteAccountButton } from "./delete-button";
import { PracticeToggles } from "./practice-toggles";

const t = fr.profil;

export default async function ProfilPage() {
  let email: string | null = null;
  let displayName: string | null = null;
  let mode: string | null = null;
  let goal: {
    type: string;
    tdee_estimate: number | null;
    calorie_target: number | null;
    protein_target_g: number | null;
  } | null = null;
  let meatWait: number | null = null;
  let kashrutEnabled = true;
  let jewishCalendarEnabled = true;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;

    if (user) {
      const [profileRes, settingsRes, goalRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("user_settings")
          .select(
            "mode, meat_to_dairy_wait_hours, kashrut_enabled, jewish_calendar_enabled",
          )
          .maybeSingle(),
        supabase
          .from("goals")
          .select("type, tdee_estimate, calorie_target, protein_target_g")
          .eq("status", "active")
          .maybeSingle(),
      ]);
      displayName = profileRes.data?.display_name ?? null;
      mode = settingsRes.data?.mode ?? null;
      meatWait = settingsRes.data?.meat_to_dairy_wait_hours ?? null;
      kashrutEnabled = settingsRes.data?.kashrut_enabled ?? true;
      jewishCalendarEnabled = settingsRes.data?.jewish_calendar_enabled ?? true;
      goal = goalRes.data ?? null;
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        {displayName ?? t.title}
      </h1>

      {email ? (
        <>
          <p className="text-sm text-ink-70">
            {t.connectedAs}{" "}
            <span className="font-semibold text-ink">{email}</span>
          </p>

          <div className="rounded-[20px] border-2 border-ink bg-paper p-4 shadow-sticker">
            <dl className="flex flex-col gap-2 text-sm">
              {mode && (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-70">{t.mode}</dt>
                  <dd>
                    <Badge>
                      {mode === "proteine"
                        ? fr.onboarding.modeProteine
                        : fr.onboarding.modeBoutargue}
                    </Badge>
                  </dd>
                </div>
              )}
              {goal && (
                <div className="flex justify-between">
                  <dt className="text-ink-70">{t.goal}</dt>
                  <dd className="font-semibold">
                    {
                      fr.onboarding.goalTypes[
                        goal.type as keyof typeof fr.onboarding.goalTypes
                      ]
                    }
                  </dd>
                </div>
              )}
              {goal?.tdee_estimate && (
                <div className="flex justify-between">
                  <dt className="text-ink-70">{t.tdee}</dt>
                  <dd className="font-mono font-semibold">
                    ~{goal.tdee_estimate} kcal
                  </dd>
                </div>
              )}
              {goal?.calorie_target && (
                <div className="flex justify-between">
                  <dt className="text-ink-70">{t.calorieTarget}</dt>
                  <dd className="font-mono font-semibold">
                    {goal.calorie_target} kcal/j
                  </dd>
                </div>
              )}
              {goal?.protein_target_g && (
                <div className="flex justify-between">
                  <dt className="text-ink-70">{t.proteinTarget}</dt>
                  <dd className="font-mono font-semibold">
                    {goal.protein_target_g} g/j
                  </dd>
                </div>
              )}
              {meatWait !== null && (
                <div className="flex justify-between">
                  <dt className="text-ink-70">{t.meatWait}</dt>
                  <dd className="font-mono font-semibold">{meatWait} h</dd>
                </div>
              )}
            </dl>
          </div>

          <PracticeToggles
            initialKashrut={kashrutEnabled}
            initialCalendar={jewishCalendarEnabled}
          />

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/poids">{fr.poids.linkFromJournal}</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href="/onboarding?edit=1">{t.redoOnboarding}</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href="/api/account/export" download>
                {t.exportData}
              </a>
            </Button>
            <DeleteAccountButton />
          </div>

          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              {fr.auth.signOut}
            </Button>
          </form>
        </>
      ) : (
        <p className="text-ink-70">{t.notConnected}</p>
      )}

      <p className="text-xs text-ink-50">{t.disclaimer}</p>
    </section>
  );
}
