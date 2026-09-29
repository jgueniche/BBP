import { redirect } from "next/navigation";

import { fr } from "@/i18n/fr";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { TagReview } from "./tag-review";

const t = fr.communaute.admin;

export default async function TagModerationPage() {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    return <p className="text-sm text-ink-70">{t.notAdmin}</p>;
  }

  const [{ data: pending }, { data: references }] = await Promise.all([
    supabase
      .from("tags")
      .select("id, slug, label")
      .eq("reviewed", false)
      .order("created_at")
      .limit(100),
    supabase
      .from("tags")
      .select("slug, label")
      .is("canonical_id", null)
      .eq("reviewed", true)
      .order("label")
      .limit(1000),
  ]);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {t.tagsTitle}
      </h1>
      <p className="text-sm text-ink-70">{t.tagsHint}</p>
      <datalist id="reference-tags">
        {(references ?? []).map((tag) => (
          <option key={tag.slug} value={tag.slug}>
            {tag.label}
          </option>
        ))}
      </datalist>
      {(pending ?? []).length === 0 ? (
        <p className="text-sm text-ink-50">{t.tagsEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {(pending ?? []).map((tag) => (
            <TagReview key={tag.id} tag={tag} />
          ))}
        </ul>
      )}
    </section>
  );
}
