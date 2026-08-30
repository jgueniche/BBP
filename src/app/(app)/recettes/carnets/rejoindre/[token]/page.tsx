import { redirect } from "next/navigation";

import { fr } from "@/i18n/fr";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { JoinCollectionClient } from "./join-client";

export default async function JoinCollectionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <section className="flex flex-col gap-3">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        {fr.recettes.collections.title}
      </h1>
      <JoinCollectionClient token={token} />
    </section>
  );
}
