import { cn } from "@/lib/utils/cn";

/** The assistant's avatar: a quiet serif monogram, no character (ADR-029). */
export function CopineAvatar({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-display text-accent-foreground italic ring-1 ring-line",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      C
    </span>
  );
}
