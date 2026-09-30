"use client";

import { BadgeCheck, BookOpen, ExternalLink, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { saveOfficialVersion } from "@/app/(app)/recettes/journal-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import { jobLabel, type ImportJobView, type JobStop } from "@/lib/import/jobs";

const t = fr.recettes.importPage;
const c = fr.creators.import;

/**
 * Why nothing is imported: the creator's wish (withdrawn post, refused
 * imports, official version) or my own copy already in my book.
 */
export function StopCard({
  stop,
  onReset,
}: {
  stop: JobStop;
  onReset: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (stop.kind === "duplicate") {
    return (
      <div className="flex flex-col gap-3 rounded-lg bg-menthe p-4">
        <p className="flex items-start gap-2 text-sm text-ink">
          <BookOpen
            size={18}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
            aria-hidden
          />
          {(stop.recipe.saved ? t.duplicateSaved : t.duplicate).replace(
            "{title}",
            stop.recipe.title,
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/recettes/${stop.recipe.slug}`}>{t.openMyCopy}</Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={onReset}>
            {t.again}
          </Button>
        </div>
      </div>
    );
  }

  const who = stop.creator ?? fr.recettes.theCreator;
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-lilas p-4">
      <p className="flex items-start gap-2 text-sm text-ink">
        {stop.kind === "official" ? (
          <BadgeCheck
            size={18}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
            aria-hidden
          />
        ) : (
          <Info
            size={18}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
            aria-hidden
          />
        )}
        {(stop.kind === "official"
          ? c.official
          : stop.code === "withdrawn"
            ? c.withdrawn
            : c.blocked
        ).replace("{creator}", who)}
      </p>
      <div className="flex flex-wrap gap-2">
        {stop.kind === "official" ? (
          <>
            <Button
              size="sm"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                const result = await saveOfficialVersion(stop.recipe.slug);
                setPending(false);
                if (!result.ok) {
                  toast(fr.recettes.saveError);
                  return;
                }
                toast(c.officialSaved);
                router.push(`/recettes/${result.slug}`);
              }}
            >
              {c.saveOfficial}
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/recettes/${stop.recipe.slug}`}>
                {fr.creators.credit.officialCta}
              </Link>
            </Button>
          </>
        ) : (
          <Button asChild size="sm">
            <a href={stop.originalUrl} target="_blank" rel="noopener">
              {fr.creators.credit.viewOriginal}
              <ExternalLink />
            </a>
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onReset}>
          {t.again}
        </Button>
      </div>
    </div>
  );
}

const when = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

/** « Mes imports »: the week's jobs, resumed or dismissed at will. */
export function ImportList({
  jobs,
  onResume,
  onDismiss,
}: {
  jobs: ImportJobView[];
  onResume: (job: ImportJobView) => void;
  onDismiss: (job: ImportJobView) => void;
}) {
  if (jobs.length === 0) return null;
  return (
    <section className="flex flex-col gap-2" aria-labelledby="mes-imports">
      <header className="flex flex-col gap-0.5">
        <h2 id="mes-imports" className="font-display text-xl font-semibold">
          {t.mine.title}
        </h2>
        <p className="text-xs text-ink-50">{t.mine.hint}</p>
      </header>
      <ul className="flex flex-col divide-y rounded-lg border bg-card">
        {jobs.map((job) => {
          const label =
            jobLabel(job) ??
            (job.kind === "captures" ? t.mine.captures : t.mine.pasted);
          const status = job.state.status;
          return (
            <li key={job.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{label}</span>
                <span className="flex items-center gap-2 text-[11px] text-ink-50">
                  <Badge
                    variant={
                      status === "ready" || status === "needs_input"
                        ? "beurre"
                        : "outline"
                    }
                  >
                    {t.mine.status[status]}
                  </Badge>
                  {when.format(new Date(job.createdAt))}
                </span>
              </div>
              {job.state.status === "saved" && job.state.recipeSlug ? (
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/recettes/${job.state.recipeSlug}`}>
                    {t.mine.open}
                  </Link>
                </Button>
              ) : status !== "saved" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onResume(job)}
                >
                  {t.mine.resume}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDismiss(job)}
                aria-label={`${t.mine.dismiss} — ${label}`}
              >
                {t.mine.dismiss}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
