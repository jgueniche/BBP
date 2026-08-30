import { cn } from "@/lib/utils/cn";

export type LogoVariant = "ink" | "paper" | "boutargue" | "mark";

export function BoutargueMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size * (40 / 64)}
      role="img"
      aria-label="BBP"
      className={cn("shrink-0", className)}
    >
      <ellipse
        cx="32"
        cy="32"
        rx="28"
        ry="18"
        fill="var(--boutargue)"
        stroke="var(--ink)"
        strokeWidth="3"
      />
      <ellipse
        cx="32"
        cy="32"
        rx="18"
        ry="10"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2"
      />
      <circle cx="26" cy="32" r="2" fill="var(--boutargue-deep)" />
      <circle cx="36" cy="28" r="2" fill="var(--boutargue-deep)" />
      <circle cx="38" cy="36" r="2" fill="var(--boutargue-deep)" />
    </svg>
  );
}

const strokeByVariant: Record<Exclude<LogoVariant, "mark">, string> = {
  ink: "var(--ink)",
  paper: "var(--paper)",
  boutargue: "var(--boutargue)",
};

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
    return <BoutargueMark size={height * 1.6} className={className} />;
  }

  const stroke = strokeByVariant[variant];

  return (
    <svg
      viewBox="0 0 236 100"
      height={height}
      width={height * 2.36}
      role="img"
      aria-label="BBP — Boukha, Boutargue & Protéines"
      className={cn("shrink-0", className)}
    >
      <g
        fill="none"
        stroke={stroke}
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* B */}
        <path d="M18 14 V 86" />
        <path d="M18 15 H 36 A 17.5 17.5 0 0 1 36 50 H 18" />
        <path d="M18 50 H 40 A 18 18 0 0 1 40 86 H 18" />
        {/* B */}
        <path d="M96 14 V 86" />
        <path d="M96 15 H 114 A 17.5 17.5 0 0 1 114 50 H 96" />
        <path d="M96 50 H 118 A 18 18 0 0 1 118 86 H 96" />
        {/* P */}
        <path d="M174 14 V 86" />
        <path d="M174 15 H 194 A 18.5 18.5 0 0 1 194 52 H 174" />
      </g>
      {/* Boutargue slice replacing the first B's lower counter */}
      <ellipse
        cx="36"
        cy="68"
        rx="10"
        ry="7"
        fill="var(--boutargue)"
        stroke={stroke}
        strokeWidth="2.5"
      />
      <circle cx="33" cy="68" r="1.3" fill="var(--boutargue-deep)" />
      <circle cx="39" cy="66.5" r="1.3" fill="var(--boutargue-deep)" />
    </svg>
  );
}
