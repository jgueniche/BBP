import { cn } from "@/lib/utils/cn";

export function MacroRing({
  value,
  max,
  label,
  unit = "",
  size = 96,
  className,
}: {
  value: number;
  max: number;
  label: string;
  unit?: string;
  size?: number;
  className?: string;
}) {
  const stroke = 8;
  const radius = (size - stroke) / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - ratio);

  return (
    <figure
      role="img"
      aria-label={`${label} : ${Math.round(value)}${unit} sur ${Math.round(max)}${unit}`}
      className={cn("inline-flex flex-col items-center gap-1", className)}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-ink-10"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-boutargue transition-[stroke-dashoffset] duration-600 ease-out motion-reduce:transition-none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-lg font-semibold leading-none">
            {Math.round(value)}
          </span>
          {unit && <span className="text-[10px] text-ink-50">{unit}</span>}
        </div>
      </div>
      <figcaption className="text-xs font-medium text-ink-70">
        {label}
      </figcaption>
    </figure>
  );
}
