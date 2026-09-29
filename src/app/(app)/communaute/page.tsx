import { Bell, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FriendsCooked } from "@/components/social/friends-cooked";
import { GroupDialog } from "@/components/social/group-dialog";
import { PostCard } from "@/components/social/post-card";
import { PostComposer } from "@/components/social/post-composer";
import { SuggestionsList } from "@/components/social/suggestions-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IlluCasserole } from "@/components/illustrations";
import { fr } from "@/i18n/fr";
import { loadFeedPosts } from "@/lib/social/feed";
import { loadSuggestions } from "@/lib/social/friends";
import { profileHref } from "@/lib/social/handles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import { PASTEL_BG, pastelFor } from "@/lib/utils/pastel";

const t = fr.communaute;

export default async function CommunautePage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string }>;
}) {
  const params = await searchParams;
  // « abonnements » is the address of the tab before session 21.
  const tab =
    params.onglet === "copines" || params.onglet === "abonnements"
      ? "copines"
      : params.onglet === "groupes"
        ? "groupes"
        : "tous";

  if (!isSupabaseConfigured) {
    return (
      <section>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t.title}
        </h1>
        <p className="mt-4 text-ink-70">{fr.auth.notConfigured}</p>
      </section>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: unread }, { data: me }] = await Promise.all([
    supabase.rpc("unread_notification_count"),
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const unreadCount = typeof unread === "number" ? unread : 0;

  return (
    <section className="flex w-full max-w-2xl flex-col gap-4">
      <header className="flex items-center gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t.title}
        </h1>
        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href="/notifications"
            aria-label={
              unreadCount === 0
                ? fr.notifications.title
                : `${fr.notifications.title} : ${
                    unreadCount === 1
                      ? fr.notifications.unreadCountOne
                      : fr.notifications.unreadCount.replace(
                          "{n}",
                          String(unreadCount),
                        )
                  }`
            }
            className="relative rounded-full border bg-card p-2 text-ink-70 shadow-soft hover:text-ink"
          >
            <Bell size={18} strokeWidth={2} aria-hidden />
            {unreadCount > 0 && (
              <span
                aria-hidden
                className="absolute -top-1 -right-1 min-w-5 rounded-full bg-primary px-1 text-center font-mono text-[11px] leading-5 font-semibold text-primary-foreground"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <Button asChild size="sm" variant="secondary">
            <Link
              href={profileHref({ id: user.id, handle: me?.username ?? null })}
            >
              <UserRound />
              {t.myProfile}
            </Link>
          </Button>
        </div>
      </header>

      <nav
        aria-label={t.title}
        className="flex gap-1 rounded-full border bg-card p-1"
      >
        {(
          [
            ["tous", t.tabs.all, "/communaute"],
            ["copines", t.tabs.following, "/communaute?onglet=copines"],
            ["groupes", t.tabs.groups, "/communaute?onglet=groupes"],
          ] as const
        ).map(([key, label, href]) => (
          <Link
            key={key}
            href={href}
            aria-current={tab === key ? "page" : undefined}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-center text-sm font-bold",
              tab === key ? "bg-ink text-paper" : "text-ink-70",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "groupes" ? (
        <GroupsTab userId={user.id} />
      ) : tab === "copines" ? (
        <FriendsTab userId={user.id} />
      ) : (
        <FeedTab userId={user.id} />
      )}
    </section>
  );
}

async function FeedTab({ userId }: { userId: string }) {
  const supabase = await createClient();
  const posts = await loadFeedPosts(supabase, userId);

  return (
    <div className="flex flex-col gap-3">
      <PostComposer />
      {posts.length === 0 ? (
        <EmptyState
          illustration={<IlluCasserole size={64} />}
          title={t.empty}
        />
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={userId} />
        ))
      )}
    </div>
  );
}

/** « Mes copines »: what the people I follow cooked, then their posts. */
async function FriendsTab({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: follows } = await supabase
    .from("follows")
    .select("followed_id")
    .eq("follower_id", userId)
    .limit(1000);
  const followedIds = (follows ?? []).map((f) => f.followed_id);
  const [cooked, posts] = await Promise.all([
    loadFeedPosts(supabase, userId, {
      onlyFollowed: true,
      kind: "cooked",
      limit: 12,
    }),
    loadFeedPosts(supabase, userId, { onlyFollowed: true }),
  ]);
  const suggestions =
    followedIds.length < 3 || posts.length === 0
      ? await loadSuggestions(supabase, userId, followedIds)
      : null;

  return (
    <div className="flex flex-col gap-4">
      <FriendsCooked posts={cooked} />
      {posts.length === 0 ? (
        <EmptyState
          illustration={<IlluCasserole size={64} />}
          title={t.emptyFollowing}
        />
      ) : null}
      {suggestions && <SuggestionsList suggestions={suggestions} />}
      {posts.length > 0 && (
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}

async function GroupsTab({ userId }: { userId: string }) {
  const supabase = await createClient();
  const [{ data: groups }, { data: memberships }] = await Promise.all([
    supabase
      .from("groups")
      .select("id, slug, name, icon, description")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("group_members").select("group_id").eq("user_id", userId),
  ]);
  const ids = (groups ?? []).map((g) => g.id);
  const { data: memberRows } =
    ids.length > 0
      ? await supabase
          .from("group_members")
          .select("group_id")
          .in("group_id", ids)
      : { data: [] };
  const counts = new Map<string, number>();
  for (const row of memberRows ?? []) {
    counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
  }
  const mine = new Set((memberships ?? []).map((m) => m.group_id));

  return (
    <div className="flex flex-col gap-3">
      <GroupDialog />
      {(groups ?? []).length === 0 ? (
        <EmptyState
          illustration={<IlluCasserole size={64} />}
          title={t.groups.empty}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {(groups ?? []).map((group) => {
            const count = counts.get(group.id) ?? 0;
            return (
              <li key={group.id}>
                <Link
                  href={`/communaute/groupes/${group.slug}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg p-3",
                    PASTEL_BG[pastelFor(group.slug)],
                  )}
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {group.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base font-semibold">
                      {group.name}
                    </span>
                    {group.description && (
                      <span className="block truncate text-xs text-ink-50">
                        {group.description}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-ink-50">
                    <Users size={13} strokeWidth={2} aria-hidden />
                    {count}{" "}
                    {count === 1 ? t.groups.memberLabel : t.groups.membersLabel}
                    {mine.has(group.id) && " ✓"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
