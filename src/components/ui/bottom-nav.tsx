"use client";

import {
  BookOpen,
  ChartLine,
  CookingPot,
  House,
  MessageCircleHeart,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { fr } from "@/i18n/fr";

// Mobile mirror of the two-space architecture: Accueil, Journal and Progrès
// cover the tracking space, Cuisine gathers recipes and community, Kémia
// closes. Moi is reached from the avatar in the Accueil header.
const items = [
  { href: "/accueil", label: fr.nav.accueilMobile, icon: House },
  { href: "/journal", label: fr.nav.journal, icon: BookOpen },
  { href: "/progres", label: fr.nav.progres, icon: ChartLine },
  { href: "/recettes", label: fr.nav.cuisine, icon: CookingPot },
  { href: "/coach", label: fr.nav.coach, icon: MessageCircleHeart },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/recettes") {
    return (
      pathname.startsWith("/recettes") || pathname.startsWith("/communaute")
    );
  }
  if (href === "/progres") {
    return pathname.startsWith("/progres") || pathname.startsWith("/poids");
  }
  return pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
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
                  active ? "text-boutargue-deep" : "text-ink-70"
                }`}
              >
                <Icon size={22} strokeWidth={2} aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
