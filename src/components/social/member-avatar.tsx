import { initialOf } from "@/lib/social/avatars";
import { cn } from "@/lib/utils/cn";
import { PASTEL_BG, pastelFor } from "@/lib/utils/pastel";

const SIZES = {
  xs: "size-6 text-[11px]",
  sm: "size-8 text-sm",
  md: "size-10 text-base",
  lg: "size-16 text-2xl",
  xl: "size-24 text-4xl",
} as const;

/** Profile photo, or the first letter on a stable pastel. */
export function MemberAvatar({
  id,
  name,
  avatarUrl,
  size = "sm",
  className,
}: {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        loading="lazy"
        className={cn(
          "shrink-0 rounded-full object-cover",
          SIZES[size],
          className,
        )}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-ink-70",
        PASTEL_BG[pastelFor(id)],
        SIZES[size],
        className,
      )}
    >
      {initialOf(name)}
    </span>
  );
}
