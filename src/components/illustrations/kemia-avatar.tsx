import { cn } from "@/lib/utils/cn";

export type KemiaExpression =
  "sourire" | "clin" | "surprise" | "fiere" | "douce";

function Face({ expression }: { expression: KemiaExpression }) {
  switch (expression) {
    case "sourire":
      return (
        <>
          <path d="M34 44 q4 -4 8 0" />
          <path d="M56 44 q4 -4 8 0" />
          <circle cx="38" cy="51" r="2.4" fill="currentColor" stroke="none" />
          <circle cx="60" cy="51" r="2.4" fill="currentColor" stroke="none" />
          <path d="M39 63 q10 9 20 0" />
        </>
      );
    case "clin":
      return (
        <>
          <path d="M34 44 q4 -4 8 0" />
          <path d="M56 43 q4 -3 8 1" />
          <circle cx="38" cy="51" r="2.4" fill="currentColor" stroke="none" />
          <path d="M56 51 h8" />
          <path d="M39 63 q10 8 20 -1" />
        </>
      );
    case "surprise":
      return (
        <>
          <path d="M33 41 q5 -5 10 -1" />
          <path d="M55 40 q5 -4 10 1" />
          <circle cx="38" cy="51" r="3" fill="currentColor" stroke="none" />
          <circle cx="60" cy="51" r="3" fill="currentColor" stroke="none" />
          <ellipse cx="49" cy="65" rx="4.5" ry="6" />
        </>
      );
    case "fiere":
      return (
        <>
          <path d="M34 43 q4 -4 8 0" />
          <path d="M56 43 q4 -4 8 0" />
          <path d="M34 51 q4 4 8 0" />
          <path d="M56 51 q4 4 8 0" />
          <path d="M37 62 q12 11 24 0" />
        </>
      );
    case "douce":
      return (
        <>
          <path d="M34 45 q4 -3 8 0" />
          <path d="M56 45 q4 -3 8 0" />
          <path d="M35 52 q3 2.5 6 0" />
          <path d="M57 52 q3 2.5 6 0" />
          <path d="M42 64 q7 5 14 0" />
        </>
      );
  }
}

export function KemiaAvatar({
  expression = "sourire",
  size = 96,
  className,
}: {
  expression?: KemiaExpression;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 98 98"
      width={size}
      height={size}
      role="img"
      aria-label={`Kémia (${expression})`}
      className={cn("shrink-0", className)}
    >
      {/* Sticker ring */}
      <circle
        cx="49"
        cy="49"
        r="46"
        fill="var(--paper)"
        stroke="var(--ink)"
        strokeWidth="3"
      />
      <g
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Headscarf */}
        <path
          d="M20 52 q-3 -32 29 -34 q32 2 29 34 q-2 -20 -29 -20 q-27 0 -29 20 z"
          fill="var(--boutargue)"
        />
        <path d="M20 52 q4 8 8 3" />
        <path d="M78 52 q-4 8 -8 3" />
        {/* Face */}
        <path d="M26 50 q0 30 23 30 q23 0 23 -30" />
        {/* Curls under the scarf */}
        <path d="M26 50 q-4 4 -1 8" />
        <path d="M72 50 q4 4 1 8" />
        {/* Earrings */}
        <circle cx="24" cy="62" r="4" fill="var(--boutargue)" />
        <circle cx="74" cy="62" r="4" fill="var(--boutargue)" />
        {/* Cheeks */}
        <circle
          cx="34"
          cy="58"
          r="2.5"
          fill="var(--boutargue-soft)"
          stroke="none"
        />
        <circle
          cx="64"
          cy="58"
          r="2.5"
          fill="var(--boutargue-soft)"
          stroke="none"
        />
        <Face expression={expression} />
      </g>
    </svg>
  );
}
