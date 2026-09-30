import { Clock, Heart } from "lucide-react";
import Link from "next/link";

import { IlluCasserole } from "@/components/illustrations";
import { VerdictPill } from "@/components/diets/verdict-pill";
import { Badge } from "@/components/ui/badge";
import { fr } from "@/i18n/fr";
import type { VerdictStatus } from "@/lib/diets/verdict";
import { cn } from "@/lib/utils/cn";
import { PASTEL_BG, pastelFor } from "@/lib/utils/pastel";

const t = fr.recettes;

export type RecipeCardData = {
  slug: string;
  title: string;
  icon: string | null;
  origin: string | null;
  version_kind: string;
  prep_min: number | null;
  cook_min: number | null;
};

export function RecipeCard({
  recipe,
  likes,
  author,
  verdict,
  tag,
  photo = null,
  className,
}: {
  recipe: RecipeCardData;
  likes?: number;
  author?: string | null;
  /** The viewer's verdict, only when they set cooking rules. */
  verdict?: VerdictStatus | null;
  /** A short word about the card in a list (« Importée »). */
  tag?: string | null;
  /** Signed address of her cover's thumbnail, when there is one. */
  photo?: string | null;
  className?: string;
}) {
  return (
    <Link
      href={`/recettes/${recipe.slug}`}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3 shadow-soft transition-colors",
        className,
      )}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed storage address
        <img
          src={photo}
          alt=""
          loading="lazy"
          className="size-14 shrink-0 rounded-[10px] border object-cover"
        />
      ) : (
        <span
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-[10px] text-ink-70",
            PASTEL_BG[pastelFor(recipe.slug)],
          )}
        >
          {recipe.icon ? (
            <span className="text-3xl leading-none" aria-hidden>
              {recipe.icon}
            </span>
          ) : (
            <IlluCasserole size={40} />
          )}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-base font-semibold">
          {recipe.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          {tag && (
            <span className="rounded-full bg-ciel px-1.5 py-0.5 text-[10px] font-semibold text-ink-70">
              {tag}
            </span>
          )}
          {verdict && <VerdictPill status={verdict} size="sm" />}
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
