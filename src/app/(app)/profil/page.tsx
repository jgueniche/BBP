import Link from "next/link";

import { InstallCard } from "@/components/pwa/install-prompt";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import { loadStoredFoodRules } from "@/lib/diets/preferences";
import type { Allergen, Diet } from "@/lib/diets/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { signOut } from "./actions";
import { DeleteAccountButton } from "./delete-button";
import { NotificationsCard } from "./notifications-card";
import { FoodRulesCard } from "./food-rules-card";
import { VisibilityCard } from "./visibility-card";

const t = fr.profil;

export default async function ProfilPage() {
  let email: string | null = null;
  let displayName: string | null = null;
  let publicProfile = false;
  let rules: { diets: Diet[]; allergens: Allergen[]; dislikes: string[] } = {
    diets: [],
    allergens: [],
    dislikes: [],
  };
  let consented = false;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;

    if (user) {
      const [profileRes, stored] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, visibility")
          .eq("id", user.id)
          .maybeSingle(),
        loadStoredFoodRules(supabase, user.id),
      ]);
      displayName = profileRes.data?.display_name ?? null;
      publicProfile = profileRes.data?.visibility === "public";
      rules = {
        diets: [...stored.diets],
        allergens: [...stored.allergens],
        dislikes: [...stored.dislikes],
      };
      consented = stored.consentedAt !== null;
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
            <FoodRulesCard initial={rules} initialConsent={consented} />

            <div className="flex flex-col gap-4">
              <VisibilityCard initialPublic={publicProfile} />

              <NotificationsCard
                vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? null}
              />

              <InstallCard />
            </div>

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
