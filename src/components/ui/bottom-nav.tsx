"use client";

import {
  CalendarDays,
  CookingPot,
  MessageCircleHeart,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useUnreadCount } from "@/components/ui/use-unread-count";
import { fr } from "@/i18n/fr";

// Mobile tabs of the cooking app: recipes first, then the week, the
// community, the assistant and the profile.
const items = [
  { href: "/recettes", label: fr.nav.recettes, icon: CookingPot },
  { href: "/planning", label: fr.nav.planning, icon: CalendarDays },
  { href: "/communaute", label: fr.nav.communaute, icon: UsersRound },
  { href: "/coach", label: fr.nav.coach, icon: MessageCircleHeart },
  { href: "/profil", label: fr.nav.profil, icon: UserRound },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname.startsWith(href);
}

export function BottomNav({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();
  const count = useUnreadCount(unread);

  return (
    <nav
      aria-label={fr.a11y.mainNav}
      className="fixed inset-x-0 bottom-0 z-10 border-t bg-surface-raised pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                  active ? "text-accent-foreground" : "text-ink-70"
                }`}
              >
                <span className="relative">
                  <Icon size={22} strokeWidth={2} aria-hidden />
                  {href === "/communaute" && count > 0 && (
                    <span
                      aria-hidden
                      className="absolute -top-0.5 -right-1 size-2.5 rounded-full border-2 border-surface-raised bg-primary"
                    />
                  )}
                </span>
                <span>{label}</span>
                {href === "/communaute" && count > 0 && (
                  <span className="sr-only">
                    {", "}
                    {count === 1
                      ? fr.notifications.unreadCountOne
                      : fr.notifications.unreadCount.replace(
                          "{n}",
                          String(count),
                        )}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
