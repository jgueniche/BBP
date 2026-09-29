"use client";

import {
  Bell,
  CalendarDays,
  CookingPot,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { CopineAvatar } from "@/components/illustrations/copine-avatar";
import { useUnreadCount } from "@/components/ui/use-unread-count";
import { fr } from "@/i18n/fr";
import { cn } from "@/lib/utils/cn";

// Cooking first (recipes, the week), then the shared space; the assistant
// and the profile are pinned at the bottom.
const cuisineItems = [
  { href: "/recettes", label: fr.nav.recettes, icon: CookingPot },
  { href: "/planning", label: fr.nav.planning, icon: CalendarDays },
] as const;

const ensembleItems = [
  { href: "/communaute", label: fr.nav.communaute, icon: UsersRound },
  { href: "/notifications", label: fr.nav.notifications, icon: Bell },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname.startsWith(href);
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  badge = 0,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  active: boolean;
  badge?: number;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-sm font-medium text-ink-70 transition-colors hover:bg-ink-10/60",
          active && "bg-boutargue-tint font-semibold text-accent-foreground",
        )}
      >
        <Icon
          size={18}
          strokeWidth={2}
          className={cn("text-ink-50", active && "text-boutargue-deep")}
        />
        {label}
        {badge > 0 && (
          <span className="ml-auto min-w-5 rounded-full bg-primary px-1.5 text-center font-mono text-[11px] leading-5 font-semibold text-primary-foreground">
            {badge > 9 ? "9+" : badge}
            <span className="sr-only">
              {", "}
              {badge === 1
                ? fr.notifications.unreadCountOne
                : fr.notifications.unreadCount.replace("{n}", String(badge))}
            </span>
          </span>
        )}
      </Link>
    </li>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pt-5 pb-1.5 text-[11px] font-bold tracking-[0.1em] text-ink-50 uppercase">
      {children}
    </p>
  );
}

export function SidebarNav({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();
  const count = useUnreadCount(unread);

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-surface-raised px-3.5 py-5 lg:flex">
      <Link href="/recettes" className="flex flex-col px-2.5">
        <span className="font-display text-2xl leading-none font-medium tracking-tight">
          {fr.app.name}
        </span>
        <span className="mt-1 text-[10.5px] font-medium text-ink-50">
          {fr.app.tagline}
        </span>
      </Link>

      <nav aria-label={fr.a11y.mainNav} className="flex flex-col">
        <GroupLabel>{fr.nav.groupCuisine}</GroupLabel>
        <ul className="flex flex-col gap-0.5">
          {cuisineItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={isActive(pathname, item.href)}
            />
          ))}
        </ul>
        <GroupLabel>{fr.nav.groupEnsemble}</GroupLabel>
        <ul className="flex flex-col gap-0.5">
          {ensembleItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={isActive(pathname, item.href)}
              badge={item.href === "/notifications" ? count : 0}
            />
          ))}
        </ul>
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t pt-3">
        <Link
          href="/coach"
          aria-current={pathname.startsWith("/coach") ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-[9px] px-2.5 py-1.5 transition-colors hover:bg-ink-10/60",
            pathname.startsWith("/coach") && "bg-boutargue-tint",
          )}
        >
          <CopineAvatar size={28} />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">{fr.nav.coach}</span>
            <span className="text-[11px] text-ink-50">
              {fr.nav.coachSubtitle}
            </span>
          </span>
        </Link>
        <Link
          href="/profil"
          aria-current={pathname.startsWith("/profil") ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-sm font-medium text-ink-70 transition-colors hover:bg-ink-10/60",
            pathname.startsWith("/profil") &&
              "bg-boutargue-tint font-semibold text-accent-foreground",
          )}
        >
          <UserRound
            size={18}
            strokeWidth={2}
            className={cn(
              "text-ink-50",
              pathname.startsWith("/profil") && "text-boutargue-deep",
            )}
          />
          {fr.nav.profil}
        </Link>
      </div>
    </aside>
  );
}
