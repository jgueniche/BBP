import { Clock, Heart } from "lucide-react";
import Link from "next/link";

import { IlluCouscoussier } from "@/components/illustrations";
import { Badge } from "@/components/ui/badge";
import { KashrutPill } from "@/components/ui/kashrut-pill";
import { fr } from "@/i18n/fr";
import type { KashrutClass } from "@/lib/kashrut/meal";

const t = fr.recettes;

export type RecipeCardData = {
  slug: string;
  title: string;
  icon: string | null;
  kashrut_class: string | null;
  is_fish: boolean;
  origin: string | null;
  version_kind: string;
  prep_min: number | null;
  cook_min: number | null;
};

export function RecipeCard({
  recipe,
  likes,
  author,
}: {
  recipe: RecipeCardData;
  likes?: number;
  author?: string | null;
}) {
  return (
    <Link
      href={`/recettes/${recipe.slug}`}
      className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-soft transition-colors"
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-[10px] bg-ink-10 text-ink-70">
        {recipe.icon ? (
          <span className="text-3xl leading-none" aria-hidden>
            {recipe.icon}
          </span>
        ) : (
          <IlluCouscoussier size={40} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-base font-bold">
          {recipe.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          {recipe.kashrut_class && (
            <KashrutPill
              kind={recipe.kashrut_class as KashrutClass}
              isFish={recipe.is_fish}
              className="scale-90"
            />
          )}
          {recipe.version_kind === "proteine" && (
            <Badge className="scale-90">{t.versions.proteine}</Badge>
          )}
          {recipe.origin && (
            <span className="text-xs text-ink-50">
              {t.origins[recipe.origin as keyof typeof t.origins]}
            </span>
          )}
          <span className="flex items-center gap-0.5 text-xs text-ink-50">
            <Clock size={12} strokeWidth={2} aria-hidden />
            {(recipe.prep_min ?? 0) + (recipe.cook_min ?? 0)} {t.minutes}
          </span>
          {typeof likes === "number" && likes > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-ink-70">
              <Heart
                size={12}
                strokeWidth={2}
                className="fill-current"
                aria-hidden
              />
              {likes}
            </span>
          )}
          {author !== undefined && (
            <span className="truncate text-xs text-ink-50">
              {t.authorBy} {author ?? t.authorHidden}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}
