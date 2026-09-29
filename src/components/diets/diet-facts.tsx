import { CircleAlert, CircleCheck } from "lucide-react";

import { fr } from "@/i18n/fr";
import type { DietFacts } from "@/lib/diets/verdict";
import { cn } from "@/lib/utils/cn";

const r = fr.regimes;

/** « Toutes les tables »: what the ingredients suit, one neutral style. */
export function DietFactChips({
  facts,
  className,
}: {
  facts: DietFacts;
  className?: string;
}) {
  if (facts.diets.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {facts.diets.map((diet) => (
        <li
          key={diet}
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-diet-border bg-diet pl-2 pr-2.5 text-xs font-medium text-diet-foreground"
        >
          <CircleCheck size={14} strokeWidth={1.75} aria-hidden />
          {r.facts[diet]}
        </li>
      ))}
      {facts.certifiedMeat && (
        <li className="inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed border-diet-border bg-diet pl-2 pr-2.5 text-xs font-medium text-diet-foreground">
          <CircleAlert size={14} strokeWidth={1.75} aria-hidden />
          {r.certifiedMeat}
        </li>
      )}
    </ul>
  );
}
