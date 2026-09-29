import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils/cn";

export type LogoVariant = "ink" | "paper" | "mark";

// "Copine" upright, "en cuisine" in raspberry italic (Claude Design v1).
const [LEAD_WORD, ...TAIL_WORDS] = APP_NAME.split(" ");
const TAIL = TAIL_WORDS.join(" ");

/**
 * Wordmark from the Claude Design identity: the app name in the display serif
 * with an italic raspberry tail, or the « C » medallion for tight spots.
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
          "inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground",
          className,
        )}
        style={{ width: height, height }}
      >
        <span
          aria-hidden
          className="inline-flex items-center justify-center rounded-full border border-primary-foreground/50 font-display italic"
          style={{
            width: height * 0.84,
            height: height * 0.84,
            fontSize: height * 0.56,
          }}
        >
          C
        </span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "font-display leading-none tracking-tight whitespace-nowrap",
        variant === "paper" ? "text-paper" : "text-ink",
        className,
      )}
      style={{ fontSize: height * 0.75 }}
    >
      <span className="font-semibold">{LEAD_WORD}</span>
      {TAIL && (
        <>
          {" "}
          <span
            className={cn(
              "font-medium italic",
              variant === "paper" ? "text-framboise-soft" : "text-framboise",
            )}
          >
            {TAIL}
          </span>
        </>
      )}
    </span>
  );
}
