import Link from "next/link";

import { MemberAvatar } from "@/components/social/member-avatar";
import { fr } from "@/i18n/fr";
import type { CookedEntry } from "@/lib/recipes/social";
import { profileHref } from "@/lib/social/handles";
import type { MemberSummary } from "@/lib/social/members";

const t = fr.recettes.cooked;

/** « Cuisinée N fois », the friends who cooked it, the members' versions. */
export function CookedGallery({
  count,
  entries,
  friends,
}: {
  count: number;
  entries: CookedEntry[];
  friends: MemberSummary[];
}) {
  return (
    <section id="versions" className="flex scroll-mt-20 flex-col gap-2">
      <h2 className="font-display text-lg font-semibold">
        {count === 1 ? t.countOne : t.count.replace("{n}", String(count))}
      </h2>
      {friends.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-70">
          <span className="font-semibold">{t.friends}</span>
          <ul className="flex flex-wrap items-center gap-1.5">
            {friends.map((friend) => (
              <li key={friend.id}>
                <Link
                  href={profileHref(friend)}
                  className="flex items-center gap-1 rounded-full bg-card py-0.5 pr-2 pl-0.5 text-xs font-semibold shadow-soft"
                >
                  <MemberAvatar
                    id={friend.id}
                    name={friend.name}
                    avatarUrl={friend.avatarUrl}
                    size="xs"
                  />
                  {friend.name ?? fr.communaute.member.anonymous}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {entries.length === 0 ? (
        <p className="text-sm text-ink-50">{t.galleryEmpty}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-1 rounded-lg border bg-card p-1.5"
            >
              {entry.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.photo}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full rounded-[10px] object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-[10px] bg-rose p-2 text-center text-xs text-ink-70">
                  {entry.text}
                </div>
              )}
              <p className="truncate px-0.5 text-[11px] text-ink-50">
                {t.byLine} {entry.authorName ?? fr.recettes.authorHidden}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
