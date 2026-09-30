import { BadgeCheck } from "lucide-react";

import { fr } from "@/i18n/fr";
import { cn } from "@/lib/utils/cn";

/** « Créatrice vérifiée »: a profile claimed and checked by the team. */
export function VerifiedBadge({
  compact = false,
  className,
}: {
  /** Icon only (the label stays for screen readers). */
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 text-framboise-deep",
        compact ? "" : "rounded-full bg-framboise-soft px-1.5 py-0.5",
        className,
      )}
      title={compact ? fr.creators.badge : undefined}
    >
      <BadgeCheck size={compact ? 14 : 12} strokeWidth={2.2} aria-hidden />
      <span
        className={
          compact ? "sr-only" : "text-[11px] font-semibold leading-none"
        }
      >
        {fr.creators.badge}
      </span>
    </span>
  );
}
