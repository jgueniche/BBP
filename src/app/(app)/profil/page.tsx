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
            <button
              type="submit"
              className="rounded-full border-2 border-ink bg-paper px-6 py-3 font-semibold shadow-[4px_4px_0_var(--color-ink)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--color-ink)]"
            >
              {fr.auth.signOut}
            </button>
          </form>
        </>
      ) : (
        <p className="mt-4 text-ink-70">{fr.profil.notConnected}</p>
      )}
    </section>
  );
}
