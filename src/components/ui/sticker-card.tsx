import { cn } from "@/lib/utils/cn";

export function StickerCard({
  interactive = false,
  className,
  ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[20px] border-2 border-ink bg-card p-4 text-card-foreground shadow-sticker",
        interactive &&
          "cursor-pointer transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-sticker-sm",
        className,
      )}
      {...props}
    />
  );
}
