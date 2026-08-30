import { Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GroupDialog } from "@/components/social/group-dialog";
import { PostCard } from "@/components/social/post-card";
import { PostComposer } from "@/components/social/post-composer";
import { EmptyState } from "@/components/ui/empty-state";
import { IlluCouscoussier } from "@/components/illustrations";
import { fr } from "@/i18n/fr";
import { loadFeedPosts } from "@/lib/social/feed";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

const t = fr.communaute;

export default async function CommunautePage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string }>;
}) {
  const params = await searchParams;
  const tab =
    params.onglet === "abonnements" || params.onglet === "groupes"
      ? params.onglet
      : "tous";

  if (!isSupabaseConfigured) {
    return (
      <section>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
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

  return (
    <section className="flex w-full max-w-2xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        {t.title}
      </h1>

      <nav
        aria-label={t.title}
        className="flex gap-1 rounded-full border bg-card p-1"
      >
        {(
          [
            ["tous", t.tabs.all, "/communaute"],
            ["abonnements", t.tabs.following, "/communaute?onglet=abonnements"],
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
      ) : (
        <FeedTab userId={user.id} onlyFollowed={tab === "abonnements"} />
      )}
    </section>
  );
}

async function FeedTab({
  userId,
  onlyFollowed,
}: {
  userId: string;
  onlyFollowed: boolean;
}) {
  const supabase = await createClient();
  const posts = await loadFeedPosts(supabase, userId, { onlyFollowed });

  return (
    <div className="flex flex-col gap-3">
      {!onlyFollowed && <PostComposer />}
      {posts.length === 0 ? (
        <EmptyState
          illustration={<IlluCouscoussier size={64} />}
          title={onlyFollowed ? t.emptyFollowing : t.empty}
        />
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={userId} />
        ))
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
          illustration={<IlluCouscoussier size={64} />}
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
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-soft"
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {group.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base font-bold">
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
