import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { fr } from "@/i18n/fr";
import { toDateString, weekStartOf } from "@/lib/planning/week";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { CoursesClient, type CoursesItem } from "./courses-client";

const t = fr.planning.courses;

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string }>;
}) {
  const params = await searchParams;
  if (!isSupabaseConfigured) return null;

  const weekStart = weekStartOf(
    /^\d{4}-\d{2}-\d{2}$/.test(params.semaine ?? "")
      ? params.semaine!
      : toDateString(new Date()),
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: plan } = await supabase
    .from("meal_plans")
    .select("id, share_token")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  const { data: items } = plan
    ? await supabase
        .from("shopping_items")
        .select("id, label, grams, aisle, kosher_note, checked")
        .eq("plan_id", plan.id)
        .order("aisle")
        .order("position")
    : { data: [] };

  const coursesItems: CoursesItem[] = (items ?? []).map((item) => ({
    id: item.id,
    label: item.label,
    grams: item.grams,
    aisle: item.aisle,
    kosherNote: item.kosher_note,
    checked: item.checked,
  }));

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <Link
          href={`/planning?semaine=${weekStart}`}
          className="flex items-center gap-1 text-xs font-semibold text-ink-50"
        >
          <ArrowLeft size={13} strokeWidth={2} aria-hidden />
          {t.backToPlanning}
        </Link>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {t.title}
        </h1>
      </header>
      <CoursesClient
        weekStart={weekStart}
        shareToken={plan?.share_token ?? null}
        initialItems={coursesItems}
      />
    </section>
  );
}
