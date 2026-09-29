import Link from "next/link";

import type { FeedPost } from "@/components/social/post-card";
import { IlluCasserole } from "@/components/illustrations";
import { cn } from "@/lib/utils/cn";
import { PASTEL_BG, pastelFor } from "@/lib/utils/pastel";

const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Paris",
});

/** A member's shared « j'ai cuisiné », photos first, each tied to its recipe. */
export function CookedGrid({ posts }: { posts: FeedPost[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {posts.map((post) => {
        const tile = (
          <>
            {post.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.photos[0]}
                alt=""
                loading="lazy"
                className="aspect-square w-full rounded-[10px] object-cover"
              />
            ) : (
              <span
                className={cn(
                  "flex aspect-square w-full items-center justify-center rounded-[10px] p-2 text-center",
                  PASTEL_BG[pastelFor(post.recipe?.slug ?? post.id)],
                )}
              >
                {post.recipe?.icon ? (
                  <span className="text-4xl leading-none" aria-hidden>
                    {post.recipe.icon}
                  </span>
                ) : (
                  <IlluCasserole size={44} />
                )}
              </span>
            )}
            <span className="block truncate px-0.5 text-xs font-semibold">
              {post.recipe?.title ?? post.text}
            </span>
            <span className="block px-0.5 text-[11px] text-ink-50">
              {dayFormat.format(new Date(post.createdAt))}
            </span>
          </>
        );
        return (
          <li key={post.id} className="rounded-lg border bg-card p-1.5">
            {post.recipe ? (
              <Link
                href={`/recettes/${post.recipe.slug}`}
                className="flex flex-col gap-1"
              >
                {tile}
              </Link>
            ) : (
              <div className="flex flex-col gap-1">{tile}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
