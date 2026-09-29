"use client";

import { cn } from "@/lib/utils/cn";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-60",
        // Off state keeps a 3:1 outline on pastel panels (WCAG 1.4.11).
        checked ? "border-transparent bg-primary" : "border-ink-50 bg-card",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full transition-all",
          checked ? "left-[22px] bg-primary-foreground" : "left-0.5 bg-ink-50",
        )}
        aria-hidden
      />
    </button>
  );
}
