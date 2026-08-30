import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { signOut } from "./actions";

export default async function ProfilPage() {
  let email: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? null;
  }

  return (
    <section>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        {fr.profil.title}
      </h1>
      {email ? (
        <>
          <p className="mt-4 text-ink-70">
            {fr.profil.connectedAs}{" "}
            <span className="font-semibold text-ink">{email}</span>
          </p>
          <form action={signOut} className="mt-8">
            <Button type="submit" variant="secondary">
              {fr.auth.signOut}
            </Button>
          </form>
        </>
      ) : (
        <p className="mt-4 text-ink-70">{fr.profil.notConnected}</p>
      )}
    </section>
  );
}
