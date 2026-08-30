import Link from "next/link";

import { KemiaAvatar } from "@/components/illustrations/kemia-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { fr } from "@/i18n/fr";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { MemoryList } from "./memory-list";

const t = fr.coach;

export default async function MemoriesPage() {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memories } = await supabase
    .from("coach_memories")
    .select("id, content, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false });

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        {t.memoriesTitle}
      </h1>
      <p className="text-sm text-ink-70">{t.memoriesHint}</p>

      {!memories || memories.length === 0 ? (
        <EmptyState
          illustration={<KemiaAvatar expression="douce" size={64} />}
          title={t.memoriesEmpty}
        />
      ) : (
        <MemoryList memories={memories} />
      )}

      <Link
        href="/coach"
        className="text-sm font-medium text-ink-70 underline underline-offset-4"
      >
        {t.back}
      </Link>
    </section>
  );
}
