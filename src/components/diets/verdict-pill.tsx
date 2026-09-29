import { Check, Minus } from "lucide-react";

import { fr } from "@/i18n/fr";
import type { VerdictStatus } from "@/lib/diets/verdict";
import { cn } from "@/lib/utils/cn";

const t = fr.regimes.status;

/**
 * Compatibility pill from the charter: shape + icon + word, never colour
 * alone (full, half, hollow, dashed). Incompatible stays neutral grey.
 */
export function VerdictPill({
  status,
  size = "md",
  className,
}: {
  status: VerdictStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  const small = size === "sm";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold",
        small ? "h-6 pl-1 pr-2 text-[11px]" : "h-8 pl-1.5 pr-3 text-sm",
        status === "compatible" && "border-ok/30 bg-ok-soft text-ok",
        status === "adaptable" && "border-warn/30 bg-warn-soft text-warn",
        status === "incompatible" &&
          "border-neutral/30 bg-neutral-soft text-neutral",
        status === "verify" && "border-dashed border-ink-50 bg-card text-ink",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full",
          small ? "size-4" : "size-5",
          status === "compatible" && "bg-ok text-ok-soft",
          status === "adaptable" &&
            "border-[1.5px] border-warn bg-[linear-gradient(90deg,var(--warn)_50%,transparent_50%)]",
          status === "incompatible" && "border-[1.5px] border-neutral",
          status === "verify" &&
            "border-[1.5px] border-dashed border-ink text-[10px] font-bold",
        )}
      >
        {status === "compatible" && (
          <Check size={small ? 10 : 12} strokeWidth={3} />
        )}
        {status === "incompatible" && (
          <Minus size={small ? 10 : 12} strokeWidth={3} />
        )}
        {status === "verify" && "?"}
      </span>
      {t[status]}
    </span>
  );
}
