import Link from "next/link";

import { InstallCard } from "@/components/pwa/install-prompt";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import { KNOWN_CITIES } from "@/lib/jewish-calendar/locations";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { signOut } from "./actions";
import { DeleteAccountButton } from "./delete-button";
import { NotificationsCard } from "./notifications-card";
import { PracticeToggles } from "./practice-toggles";

const t = fr.profil;

export default async function ProfilPage() {
  let email: string | null = null;
  let displayName: string | null = null;
  let kashrutEnabled = false;
  let jewishCalendarEnabled = false;
  let publicProfile = false;
  let calendarPrefs = {
    city: "",
    israelCalendar: false,
    minorFasts: false,
    kitniyot: true,
    noFishWithMeat: false,
    candleOffsetMin: 18,
  };

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;

    if (user) {
      const [profileRes, settingsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, visibility, city")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("user_settings")
          .select(
            "kashrut_enabled, jewish_calendar_enabled, israel_calendar, minor_fasts, kitniyot, no_fish_with_meat, candle_offset_min",
          )
          .maybeSingle(),
      ]);
      displayName = profileRes.data?.display_name ?? null;
      publicProfile = profileRes.data?.visibility === "public";
      kashrutEnabled = settingsRes.data?.kashrut_enabled ?? false;
      jewishCalendarEnabled =
        settingsRes.data?.jewish_calendar_enabled ?? false;
      calendarPrefs = {
        city: profileRes.data?.city ?? "",
        israelCalendar: settingsRes.data?.israel_calendar ?? false,
        minorFasts: settingsRes.data?.minor_fasts ?? false,
        kitniyot: settingsRes.data?.kitniyot ?? true,
        noFishWithMeat: settingsRes.data?.no_fish_with_meat ?? false,
        candleOffsetMin: settingsRes.data?.candle_offset_min ?? 18,
      };
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <h1 className="font-display text-3xl font-medium tracking-tight">
        {displayName ?? t.title}
      </h1>

      {email ? (
        <>
          <p className="text-sm text-ink-70">
            {t.connectedAs}{" "}
            <span className="font-semibold text-ink">{email}</span>
          </p>

          <div className="grid items-start gap-4 md:grid-cols-2">
            <PracticeToggles
              initialKashrut={kashrutEnabled}
              initialCalendar={jewishCalendarEnabled}
              initialPublicProfile={publicProfile}
              initialPrefs={calendarPrefs}
              knownCities={[...KNOWN_CITIES]}
            />

            <NotificationsCard
              vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? null}
            />

            <InstallCard />

            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button asChild variant="secondary" size="sm">
                <Link href="/communaute">{fr.communaute.title}</Link>
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
