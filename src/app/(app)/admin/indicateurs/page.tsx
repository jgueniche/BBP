import { ChartNoAxesColumn } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { fr } from "@/i18n/fr";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const t = fr.communaute.admin;

function readRate(value: unknown): {
  imported: number;
  cooked: number;
  imported30: number;
  cooked30: number;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const n = (key: string) => (typeof row[key] === "number" ? row[key] : 0);
  return {
    imported: n("imported"),
    cooked: n("cooked"),
    imported30: n("imported_30d"),
    cooked30: n("cooked_30d"),
  };
}

function Share({
  label,
  cooked,
  imported,
}: {
  label: string;
  cooked: number;
  imported: number;
}) {
  const percent = imported > 0 ? Math.round((cooked / imported) * 100) : null;
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
      <p className="text-xs font-bold tracking-[0.1em] text-ink-50 uppercase">
        {label}
      </p>
      <p className="font-mono text-3xl font-semibold">
        {percent === null ? "—" : `${percent} %`}
      </p>
      <p className="text-sm text-ink-70">
        {t.indicatorValue
          .replace("{cooked}", String(cooked))
          .replace("{imported}", String(imported))}
      </p>
    </div>
  );
}

/** The key indicator of the plan: imports that become a « j'ai cuisiné ». */
export default async function IndicatorPage() {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    return (
      <section>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t.indicatorTitle}
        </h1>
        <p className="mt-3 text-sm text-ink-70">{t.notAdmin}</p>
      </section>
    );
  }

  const { data } = await supabase.rpc("import_cook_rate");
  const rate = readRate(data);

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <Link
        href="/admin/moderation"
        className="self-start text-xs font-semibold text-ink-50 hover:text-ink"
      >
        ← {t.title}
      </Link>
      <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
        <ChartNoAxesColumn size={26} strokeWidth={2} aria-hidden />
        {t.indicatorTitle}
      </h1>
      <p className="text-sm text-ink-70">{t.indicatorIntro}</p>
      {!rate || rate.imported === 0 ? (
        <p className="text-sm text-ink-50">{t.indicatorEmpty}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Share
            label={t.indicatorAll}
            cooked={rate.cooked}
            imported={rate.imported}
          />
          <Share
            label={t.indicator30}
            cooked={rate.cooked30}
            imported={rate.imported30}
          />
        </div>
      )}
      <p className="text-xs text-ink-50">{t.indicatorNote}</p>
    </section>
  );
}
