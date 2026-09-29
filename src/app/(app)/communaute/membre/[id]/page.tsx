import { Pencil, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { VerifiedBadge } from "@/components/creators/verified-badge";
import {
  RecipeCard,
  type RecipeCardData,
} from "@/components/recipes/recipe-card";
import { CookedGrid } from "@/components/social/cooked-grid";
import { FollowButton } from "@/components/social/follow-button";
import { MemberAvatar } from "@/components/social/member-avatar";
import { MemberMenu, UnblockButton } from "@/components/social/member-menu";
import { PostCard } from "@/components/social/post-card";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import { creatorPath } from "@/lib/creators/identity";
import { loadClaimedCreators } from "@/lib/creators/server";
import { loadFoodRules } from "@/lib/diets/preferences";
import { verdictStatuses } from "@/lib/diets/recipes";
import { loadFeedPosts } from "@/lib/social/feed";
import { isUuid, profileHref } from "@/lib/social/handles";
import { loadProfileCounts, resolveMember } from "@/lib/social/members";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

const t = fr.communaute.member;

const TABS = [
  ["cuisine", t.tabs.cooked],
  ["recettes", t.tabs.recipes],
  ["publications", t.tabs.posts],
] as const;

type Tab = (typeof TABS)[number][0];

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const [{ id }, { onglet }] = await Promise.all([params, searchParams]);
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await resolveMember(supabase, id);
  if (!member) notFound();
  const tab: Tab =
    onglet === "recettes" || onglet === "publications" ? onglet : "cuisine";
  const base = profileHref(member);
  // One address per public profile: its @handle.
  if (isUuid(decodeURIComponent(id)) && member.handle) {
    redirect(tab === "cuisine" ? base : `${base}?onglet=${tab}`);
  }

  const isMe = member.id === user.id;
  const [counts, followingRes, followsMeRes, blockRes, claimed] =
    await Promise.all([
      loadProfileCounts(supabase, member.id),
      isMe
        ? Promise.resolve({ data: null })
        : supabase
            .from("follows")
            .select("followed_id")
            .eq("follower_id", user.id)
            .eq("followed_id", member.id)
            .maybeSingle(),
      isMe
        ? Promise.resolve({ data: null })
        : supabase
            .from("follows")
            .select("follower_id")
            .eq("follower_id", member.id)
            .eq("followed_id", user.id)
            .maybeSingle(),
      isMe
        ? Promise.resolve({ data: null })
        : supabase
            .from("blocks")
            .select("blocked_id")
            .eq("blocker_id", user.id)
            .eq("blocked_id", member.id)
            .maybeSingle(),
      loadClaimedCreators(supabase, [member.id]),
    ]);
  const iBlocked = blockRes.data !== null;
  // Her verified creator profiles (linked only while her profile is public).
  const creatorProfiles = claimed.get(member.id) ?? [];
  const name = member.name ?? t.anonymous;

  return (
    <section className="flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <MemberAvatar
          id={member.id}
          name={member.name}
          avatarUrl={member.avatarUrl}
          size="xl"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {name}
            </h1>
            {creatorProfiles.length > 0 && <VerifiedBadge />}
            {followsMeRes.data && (
              <span className="rounded-full bg-ink-10 px-2 py-0.5 text-[11px] font-semibold text-ink-70">
                {t.followsYou}
              </span>
            )}
          </div>
          {member.handle && (
            <p className="font-mono text-xs text-ink-50">@{member.handle}</p>
          )}
          {creatorProfiles.length > 0 && (
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-70">
              {creatorProfiles.map((creator) => (
                <Link
                  key={creator.id}
                  href={creatorPath(creator.platform, creator.handle)}
                  className="font-semibold underline underline-offset-2"
                >
                  {creator.label}
                  <span className="font-normal text-ink-50">
                    {" "}
                    · {fr.creators.platforms[creator.platform]}
                  </span>
                </Link>
              ))}
            </p>
          )}
          {member.bio && (
            <p className="max-w-prose whitespace-pre-wrap text-sm text-ink-70">
              {member.bio}
            </p>
          )}
          {counts && (
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-70">
              {(
                [
                  [counts.followers, t.followersOne, t.followers],
                  [counts.following, t.followingOne, t.following],
                  [counts.recipes, t.recipesOne, t.recipes],
                ] as const
              ).map(([n, one, many]) => (
                <span key={many}>
                  <span className="font-mono font-semibold text-ink">{n}</span>{" "}
                  {n === 1 ? one : many}
                </span>
              ))}
            </p>
          )}
          {!member.isPublic && (
            <p className="text-xs text-ink-50">
              {isMe ? t.ownPrivateNotice : t.privateNotice}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isMe ? (
            <>
              <Button asChild size="sm" variant="secondary">
                <Link href="/profil#mon-profil">
                  <Pencil />
                  {t.editProfile}
                </Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href="/communaute/reseau">
                  <Users />
                  {t.myNetwork}
                </Link>
              </Button>
            </>
          ) : iBlocked ? null : (
            <>
              <FollowButton
                userId={member.id}
                initialFollowing={followingRes.data !== null}
              />
              <MemberMenu userId={member.id} />
            </>
          )}
        </div>
      </header>

      {iBlocked ? (
        <p className="rounded-lg bg-ink-10 p-4 text-sm text-ink-70">
          {t.blockedNotice} <UnblockButton userId={member.id} />
        </p>
      ) : (
        <>
          <nav
            aria-label={name}
            className="flex gap-1 rounded-full border bg-card p-1"
          >
            {TABS.map(([key, label]) => (
              <Link
                key={key}
                href={key === "cuisine" ? base : `${base}?onglet=${key}`}
                aria-current={tab === key ? "page" : undefined}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 text-center text-sm font-bold",
                  tab === key ? "bg-ink text-paper" : "text-ink-70",
                )}
              >
                {label}
                {key === "cuisine" && counts && counts.cooked > 0 && (
                  <span className="ml-1 font-mono text-xs opacity-70">
                    {counts.cooked}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          {tab === "cuisine" && (
            <CookedTab memberId={member.id} viewerId={user.id} />
          )}
          {tab === "recettes" && (
            <RecipesTab memberId={member.id} viewerId={user.id} />
          )}
          {tab === "publications" && (
            <PostsTab memberId={member.id} viewerId={user.id} />
          )}
        </>
      )}
    </section>
  );
}

async function CookedTab({
  memberId,
  viewerId,
}: {
  memberId: string;
  viewerId: string;
}) {
  const supabase = await createClient();
  const posts = await loadFeedPosts(supabase, viewerId, {
    authorId: memberId,
    kind: "cooked",
    limit: 60,
  });
  if (posts.length === 0) {
    return <p className="text-sm text-ink-50">{t.cookedEmpty}</p>;
  }
  return <CookedGrid posts={posts} />;
}

async function RecipesTab({
  memberId,
  viewerId,
}: {
  memberId: string;
  viewerId: string;
}) {
  const supabase = await createClient();
  const { data: recipes } = await supabase
    .from("recipes")
    .select(
      "id, title, slug, icon, origin, prep_min, cook_min, version_kind, author_id",
    )
    .eq("author_id", memberId)
    .eq("visibility", "community")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(60);
  if ((recipes ?? []).length === 0) {
    return <p className="text-sm text-ink-50">{t.recipesEmpty}</p>;
  }
  const rules = await loadFoodRules(supabase, viewerId);
  const statuses = await verdictStatuses(
    supabase,
    rules,
    (recipes ?? []).map((r) => r.id),
  );
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {(recipes ?? []).map((recipe) => (
        <li key={recipe.id}>
          <RecipeCard
            recipe={recipe as RecipeCardData}
            verdict={statuses.get(recipe.id) ?? null}
          />
        </li>
      ))}
    </ul>
  );
}

async function PostsTab({
  memberId,
  viewerId,
}: {
  memberId: string;
  viewerId: string;
}) {
  const supabase = await createClient();
  const posts = await loadFeedPosts(supabase, viewerId, {
    authorId: memberId,
    limit: 30,
  });
  if (posts.length === 0) {
    return <p className="text-sm text-ink-50">{t.noPosts}</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={viewerId} />
      ))}
    </div>
  );
}
