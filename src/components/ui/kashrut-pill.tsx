import { fr } from "@/i18n/fr";
import { cn } from "@/lib/utils/cn";

export type KashrutClass = "bassari" | "halavi" | "parve";

const dotColor: Record<KashrutClass, string> = {
  bassari: "bg-bassari",
  halavi: "bg-halavi",
  parve: "bg-parve",
};

export function KashrutPill({
  kind,
  isFish = false,
  className,
}: {
  kind: KashrutClass;
  isFish?: boolean;
  className?: string;
}) {
  const label =
    kind === "parve" && isFish ? fr.kashrut.parveFish : fr.kashrut[kind];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-paper px-2.5 py-0.5 text-xs font-semibold",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-2.5 rounded-full", dotColor[kind])}
      />
      {label}
    </span>
  );
}
