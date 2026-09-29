import { cn } from "@/lib/utils/cn";

type IllustrationProps = { size?: number; className?: string };

function Frame({
  size = 64,
  className,
  label,
  children,
}: IllustrationProps & { label: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={label}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
    >
      {children}
    </svg>
  );
}

export function IlluCasserole(props: IllustrationProps) {
  return (
    <Frame {...props} label="Cocotte">
      <path d="M12 30 h40 v12 a10 10 0 0 1 -10 10 h-20 a10 10 0 0 1 -10 -10 z" />
      <path d="M8 30 h48" />
      <path d="M6 34 h6 M52 34 h6" />
      <path d="M26 22 q6 -6 12 0" stroke="var(--primary)" />
      <path
        d="M24 14 q2 -3 0 -6 M32 14 q2 -3 0 -6 M40 14 q2 -3 0 -6"
        strokeWidth="2"
      />
    </Frame>
  );
}

export function IlluOlive(props: IllustrationProps) {
  return (
    <Frame {...props} label="Olive">
      <ellipse cx="30" cy="38" rx="13" ry="16" />
      <path d="M34 22 q4 -8 14 -9" />
      <path d="M44 15 q7 -1 8 5 q-7 3 -10 -1" fill="var(--boutargue)" />
      <path d="M25 33 q-2 4 0 8" />
    </Frame>
  );
}

export function IlluCoeur(props: IllustrationProps) {
  return (
    <Frame {...props} label="Cœur">
      <path
        d="M32 50 q-18 -12 -18 -24 a9.5 9.5 0 0 1 18 -4 a9.5 9.5 0 0 1 18 4 q0 12 -18 24 z"
        fill="var(--boutargue)"
      />
      <path d="M24 22 q-3 1 -3 5" stroke="var(--paper)" />
    </Frame>
  );
}

export function IlluEtoile(props: IllustrationProps) {
  return (
    <Frame {...props} label="Étoile de badge">
      <circle cx="32" cy="32" r="24" />
      <path
        d="M32 18 l4 9 10 1 -7.5 7 2 10 -8.5 -5 -8.5 5 2 -10 -7.5 -7 10 -1 z"
        fill="var(--boutargue)"
      />
    </Frame>
  );
}

export const ILLUSTRATIONS = [
  { name: "Cocotte", Component: IlluCasserole },
  { name: "Olive", Component: IlluOlive },
  { name: "Cœur", Component: IlluCoeur },
  { name: "Étoile", Component: IlluEtoile },
] as const;
