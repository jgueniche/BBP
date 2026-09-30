import Link from "next/link";
import { redirect } from "next/navigation";

import { FollowButton } from "@/components/social/follow-button";
import { MemberAvatar } from "@/components/social/member-avatar";
import { RemoveFollowerButton } from "@/components/social/remove-follower-button";
import { fr } from "@/i18n/fr";
import { profileHref } from "@/lib/social/handles";
import { anonymousMember, loadMembers } from "@/lib/social/members";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

const t = fr.communaute.network;

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ liste?: string }>;
}) {
  const { liste } = await searchParams;
  const tab = liste === "abonnes" ? "abonnes" : "abonnements";
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS: only the two people of a follow can read it.
  const [{ data: following }, { data: followers }] = await Promise.all([
    supabase
      .from("follows")
      .select("followed_id")
      .eq("follower_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("follows")
      .select("follower_id")
      .eq("followed_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  const followingIds = (following ?? []).map((f) => f.followed_id);
  const followerIds = (followers ?? []).map((f) => f.follower_id);
  const iFollow = new Set(followingIds);
  const ids = tab === "abonnements" ? followingIds : followerIds;
  const members = await loadMembers(supabase, ids);

  return (
    <section className="flex w-full max-w-2xl flex-col gap-4">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t.title}
        </h1>
        <p className="mt-1 text-sm text-ink-50">{t.hint}</p>
      </header>

      <nav
        aria-label={t.title}
        className="flex gap-1 rounded-full border bg-card p-1"
      >
        {(
          [
            ["abonnements", t.tabs.following, followingIds.length],
            ["abonnes", t.tabs.followers, followerIds.length],
          ] as const
        ).map(([key, label, count]) => (
          <Link
            key={key}
            href={
              key === "abonnements"
                ? "/communaute/reseau"
                : "/communaute/reseau?liste=abonnes"
            }
            aria-current={tab === key ? "page" : undefined}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-center text-sm font-bold",
              tab === key ? "bg-ink text-paper" : "text-ink-70",
            )}
          >
            {label}
            <span className="ml-1 font-mono text-xs opacity-70">{count}</span>
          </Link>
        ))}
      </nav>

      {ids.length === 0 ? (
        <p className="rounded-lg bg-rose p-4 text-sm text-ink-70">
          {tab === "abonnements" ? t.followingEmpty : t.followersEmpty}
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border bg-card">
          {ids.map((id) => {
            const member = members.get(id) ?? anonymousMember(id);
            return (
              <li key={id} className="flex items-center gap-3 p-3">
                <MemberAvatar
                  id={id}
                  name={member.name}
                  avatarUrl={member.avatarUrl}
                  size="md"
                />
                <Link href={profileHref(member)} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {member.name ?? fr.communaute.member.anonymous}
                  </span>
                  {member.handle && (
                    <span className="block truncate font-mono text-[11px] text-ink-50">
                      @{member.handle}
                    </span>
                  )}
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  {tab === "abonnements" ? (
                    <FollowButton userId={id} initialFollowing size="xs" />
                  ) : (
                    <>
                      {!iFollow.has(id) && (
                        <FollowButton
                          userId={id}
                          initialFollowing={false}
                          label={t.followBack}
                          size="xs"
                        />
                      )}
                      <RemoveFollowerButton userId={id} />
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
