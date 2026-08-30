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

export function IlluBoutargue(props: IllustrationProps) {
  return (
    <Frame {...props} label="Tranche de boutargue">
      <ellipse cx="32" cy="34" rx="22" ry="13" fill="var(--boutargue)" />
      <ellipse cx="32" cy="34" rx="14" ry="7.5" />
      <circle
        cx="27"
        cy="34"
        r="1.6"
        fill="var(--boutargue-deep)"
        stroke="none"
      />
      <circle
        cx="35"
        cy="31"
        r="1.6"
        fill="var(--boutargue-deep)"
        stroke="none"
      />
      <circle
        cx="37"
        cy="37"
        r="1.6"
        fill="var(--boutargue-deep)"
        stroke="none"
      />
    </Frame>
  );
}

export function IlluCouscoussier(props: IllustrationProps) {
  return (
    <Frame {...props} label="Couscoussier">
      <path d="M16 34 h32 l-4 16 a4 4 0 0 1 -4 3 h-16 a4 4 0 0 1 -4 -3 z" />
      <path d="M19 20 h26 l3 14 h-32 z" />
      <path d="M22 27 h20" strokeDasharray="1 5" />
      <path d="M24 14 q8 -5 16 0" />
      <circle cx="32" cy="12" r="2.5" fill="var(--boutargue)" />
      <path d="M13 40 h-4 M55 40 h-4" />
    </Frame>
  );
}

export function IlluBrik(props: IllustrationProps) {
  return (
    <Frame {...props} label="Brik à l'œuf">
      <path d="M12 48 L52 14 q4 10 -2 20 q-6 10 -18 14 q-10 3 -20 0 z" />
      <path d="M18 44 q10 0 18 -7" strokeDasharray="1 5" />
      <circle cx="38" cy="30" r="5" fill="var(--boutargue)" />
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

export function IlluHarissa(props: IllustrationProps) {
  return (
    <Frame {...props} label="Tube de harissa">
      <path d="M24 18 h16 v34 a4 4 0 0 1 -4 4 h-8 a4 4 0 0 1 -4 -4 z" />
      <path d="M26 12 h12 v6 h-12 z" fill="var(--boutargue)" />
      <path d="M24 30 h16" />
      <path d="M28 38 q4 6 0 10 M36 38 q-4 6 0 10" />
      <path d="M40 22 q4 2 3 6" fill="none" stroke="var(--boutargue)" />
    </Frame>
  );
}

export function IlluKemiaPlatter(props: IllustrationProps) {
  return (
    <Frame {...props} label="Plateau de kémia">
      <circle cx="32" cy="32" r="24" />
      <circle cx="24" cy="24" r="7" />
      <circle cx="42" cy="26" r="6" fill="var(--boutargue-soft)" />
      <circle cx="26" cy="42" r="6" />
      <circle cx="42" cy="41" r="5" fill="var(--boutargue)" />
      <circle cx="24" cy="24" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="27" cy="42" r="1.5" fill="currentColor" stroke="none" />
    </Frame>
  );
}

export function IlluHaltere(props: IllustrationProps) {
  return (
    <Frame {...props} label="Haltère">
      <path d="M22 28 h20 v8 h-20 z" />
      <rect
        x="12"
        y="20"
        width="8"
        height="24"
        rx="3"
        fill="var(--boutargue-soft)"
      />
      <rect
        x="44"
        y="20"
        width="8"
        height="24"
        rx="3"
        fill="var(--boutargue-soft)"
      />
      <path d="M8 26 v12 M56 26 v12" />
    </Frame>
  );
}

export function IlluBalance(props: IllustrationProps) {
  return (
    <Frame {...props} label="Balance">
      <rect x="12" y="14" width="40" height="36" rx="8" />
      <path d="M24 22 a10 10 0 0 1 16 0" />
      <path d="M32 27 l4 -5" stroke="var(--boutargue)" />
      <path d="M22 38 h20" strokeDasharray="1 5" />
    </Frame>
  );
}

export function IlluChaussure(props: IllustrationProps) {
  return (
    <Frame {...props} label="Chaussure de sport">
      <path d="M8 42 q1 -8 9 -9 l7 -1 8 -9 q5 8 15 10 l7 1 q4 1 4 8 z" />
      <path
        d="M8 42 h50 v4 a3 3 0 0 1 -3 3 h-44 a3 3 0 0 1 -3 -3 z"
        fill="var(--boutargue-soft)"
      />
      <path d="M27 30 l4 3 M32 25 l4 3" />
      <path d="M14 38 q7 -2 11 2" stroke="var(--boutargue)" />
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

export function IlluBougies(props: IllustrationProps) {
  return (
    <Frame {...props} label="Bougies de chabbat">
      <rect x="20" y="26" width="6" height="22" rx="2" />
      <rect x="38" y="26" width="6" height="22" rx="2" />
      <path d="M14 52 h36 v4 h-36 z" />
      <path d="M23 14 q4 4 0 8 q-4 -4 0 -8 z" fill="var(--boutargue)" />
      <path d="M41 14 q4 4 0 8 q-4 -4 0 -8 z" fill="var(--boutargue)" />
      <path d="M23 22 v4 M41 22 v4" />
    </Frame>
  );
}

export const ILLUSTRATIONS = [
  { name: "Boutargue", Component: IlluBoutargue },
  { name: "Couscoussier", Component: IlluCouscoussier },
  { name: "Brik", Component: IlluBrik },
  { name: "Olive", Component: IlluOlive },
  { name: "Harissa", Component: IlluHarissa },
  { name: "Plateau de kémia", Component: IlluKemiaPlatter },
  { name: "Haltère", Component: IlluHaltere },
  { name: "Balance", Component: IlluBalance },
  { name: "Chaussure", Component: IlluChaussure },
  { name: "Cœur", Component: IlluCoeur },
  { name: "Étoile", Component: IlluEtoile },
  { name: "Bougies de chabbat", Component: IlluBougies },
] as const;
