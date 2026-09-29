import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils/cn";

export type LogoVariant = "ink" | "paper" | "mark";

/**
 * Temporary wordmark until the Claude Design identity lands: the app name in
 * the display serif, or a « C » monogram for tight spots.
 */
export function Logo({
  variant = "ink",
  height = 40,
  className,
}: {
  variant?: LogoVariant;
  height?: number;
  className?: string;
}) {
  if (variant === "mark") {
    return (
      <span
        role="img"
        aria-label={APP_NAME}
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-primary font-display text-primary-foreground italic",
          className,
        )}
        style={{ width: height, height, fontSize: height * 0.6 }}
      >
        C
      </span>
    );
  }
  return (
    <span
      className={cn(
        "font-display leading-none font-medium tracking-tight whitespace-nowrap",
        variant === "paper" ? "text-paper" : "text-ink",
        className,
      )}
      style={{ fontSize: height * 0.75 }}
    >
      {APP_NAME}
    </span>
  );
}
