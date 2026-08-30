"use client";

import {
  BookOpen,
  CalendarDays,
  CookingPot,
  MessageCircleHeart,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { fr } from "@/i18n/fr";

const items = [
  { href: "/journal", label: fr.nav.journal, icon: BookOpen },
  { href: "/recettes", label: fr.nav.recettes, icon: CookingPot },
  { href: "/coach", label: fr.nav.coach, icon: MessageCircleHeart },
  { href: "/planning", label: fr.nav.planning, icon: CalendarDays },
  { href: "/profil", label: fr.nav.profil, icon: UserRound },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                  active ? "text-boutargue-deep" : "text-ink-70"
                }`}
              >
                <Icon size={24} strokeWidth={2} aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
