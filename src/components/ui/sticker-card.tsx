import { cn } from "@/lib/utils/cn";

export function StickerCard({
  interactive = false,
  className,
  ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 text-card-foreground shadow-soft",
        interactive &&
          "cursor-pointer transition-colors hover:border-ink-30/70 active:bg-ink-10/40",
        className,
      )}
      {...props}
    />
  );
}
