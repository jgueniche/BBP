import Link from "next/link";

import type { FeedPost } from "@/components/social/post-card";
import { IlluCasserole } from "@/components/illustrations";
import { fr } from "@/i18n/fr";
import { profileHref } from "@/lib/social/handles";
import { cn } from "@/lib/utils/cn";
import { PASTEL_BG, pastelFor } from "@/lib/utils/pastel";

const t = fr.communaute.friends;

/** « Tes copines ont cuisiné »: their latest shared versions, in one row. */
export function FriendsCooked({ posts }: { posts: FeedPost[] }) {
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="friends-cooked" className="flex flex-col gap-2">
      <h2 id="friends-cooked" className="font-display text-lg font-semibold">
        {t.cookedTitle}
      </h2>
      <ul className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        {posts.map((post) => (
          <li key={post.id} className="w-32 shrink-0 snap-start">
            <Link
              href={
                post.recipe
                  ? `/recettes/${post.recipe.slug}`
                  : profileHref({
                      id: post.authorId,
                      handle: post.authorHandle,
                    })
              }
              className="flex flex-col gap-1 rounded-lg border bg-card p-1.5"
            >
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
                    "flex aspect-square w-full items-center justify-center rounded-[10px]",
                    PASTEL_BG[pastelFor(post.recipe?.slug ?? post.id)],
                  )}
                >
                  {post.recipe?.icon ? (
                    <span className="text-3xl leading-none" aria-hidden>
                      {post.recipe.icon}
                    </span>
                  ) : (
                    <IlluCasserole size={36} />
                  )}
                </span>
              )}
              <span className="block truncate px-0.5 text-xs font-semibold">
                {post.recipe?.title ?? post.text}
              </span>
              <span className="block truncate px-0.5 text-[11px] text-ink-50">
                {t.by} {post.authorName ?? fr.communaute.member.anonymous}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
