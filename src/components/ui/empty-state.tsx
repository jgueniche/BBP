import { cn } from "@/lib/utils/cn";

export function EmptyState({
  illustration,
  title,
  hint,
  action,
  className,
}: {
  illustration?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-[20px] border-2 border-dashed border-ink-30 px-6 py-10 text-center",
        className,
      )}
    >
      {illustration && <div className="text-ink">{illustration}</div>}
      <p className="font-display text-lg font-bold">{title}</p>
      {hint && <p className="max-w-xs text-sm text-ink-50">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
