import Link from "next/link";

import { FollowButton } from "@/components/social/follow-button";
import { MemberAvatar } from "@/components/social/member-avatar";
import { fr } from "@/i18n/fr";
import type { Suggestion } from "@/lib/social/friends";
import { profileHref } from "@/lib/social/handles";

const t = fr.communaute.friends;

export function SuggestionsList({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  return (
    <section
      aria-labelledby="suggestions"
      className="flex flex-col gap-2 rounded-lg bg-lilas p-4"
    >
      <h2 id="suggestions" className="font-display text-lg font-semibold">
        {t.suggestionsTitle}
      </h2>
      <p className="text-sm text-ink-70">{t.suggestionsHint}</p>
      {suggestions.length === 0 ? (
        <p className="text-sm text-ink-50">{t.noSuggestions}</p>
      ) : (
        <ul className="mt-1 flex flex-col gap-2">
          {suggestions.map((member) => (
            <li
              key={member.id}
              className="flex items-center gap-3 rounded-lg bg-card p-2.5"
            >
              <MemberAvatar
                id={member.id}
                name={member.name}
                avatarUrl={member.avatarUrl}
                size="md"
              />
              <Link href={profileHref(member)} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">
                  {member.name}
                </span>
                <span className="block truncate text-[11px] text-ink-50">
                  {member.shared === 0
                    ? t.recent
                    : member.shared === 1
                      ? t.sharedOne
                      : t.shared.replace("{n}", String(member.shared))}
                </span>
              </Link>
              <FollowButton
                userId={member.id}
                initialFollowing={false}
                size="xs"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
