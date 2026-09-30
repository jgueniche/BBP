import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { fr } from "@/i18n/fr";
import type { CreditView } from "@/lib/creators/credit";
import { cn } from "@/lib/utils/cn";

import { VerifiedBadge } from "./verified-badge";

/**
 * « D'après une vidéo de @X » + « Voir l'original ». The original opens
 * through /api/sortie (an anonymous count for her); the referrer origin
 * is kept (no « noreferrer ») so her own statistics see Copine.
 */
export function CreatorCredit({
  view,
  recipeId,
  className,
}: {
  view: CreditView;
  recipeId: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-70",
        className,
      )}
    >
      <span>{view.prefix}</span>
      {view.name &&
        (view.href ? (
          <Link
            href={view.href}
            className="font-semibold text-ink underline-offset-2 hover:underline"
          >
            {view.name}
          </Link>
        ) : (
          <span className="font-semibold text-ink">{view.name}</span>
        ))}
      {view.verified && <VerifiedBadge compact />}
      <a
        href={`/api/sortie/${recipeId}`}
        target="_blank"
        rel="noopener nofollow"
        className="inline-flex items-center gap-0.5 font-medium underline underline-offset-2"
      >
        {fr.creators.credit.viewOriginal}
        <ExternalLink size={11} strokeWidth={2} aria-hidden />
      </a>
    </p>
  );
}
