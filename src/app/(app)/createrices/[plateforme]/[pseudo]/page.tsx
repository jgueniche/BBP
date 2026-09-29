import { ExternalLink, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ClaimPanel, type ClaimState } from "@/components/creators/claim-panel";
import {
  CreatorSpace,
  type SpacePost,
} from "@/components/creators/creator-space";
import { RemovalRequest } from "@/components/creators/removal-request";
import { VerifiedBadge } from "@/components/creators/verified-badge";
import {
  RecipeCard,
  type RecipeCardData,
} from "@/components/recipes/recipe-card";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import {
  loadCreatorByPath,
  loadCreatorLinks,
  loadCreatorPostStats,
  loadCreatorTotals,
} from "@/lib/creators/server";
import { loadFoodRules } from "@/lib/diets/preferences";
import { verdictStatuses } from "@/lib/diets/recipes";
import { profileHref, isUuid } from "@/lib/social/handles";
import { loadMembers } from "@/lib/social/members";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const t = fr.creators;
const p = t.page;

type Params = Promise<{ plateforme: string; pseudo: string }>;

/** French keeps the singular for 0 and 1. */
function count(n: number, one: string, many: string) {
  return (n < 2 ? one : many).replace("{n}", String(n));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { plateforme, pseudo } = await params;
  const handle = decodeURIComponent(pseudo);
  return { title: plateforme === "web" ? handle : `@${handle}` };
}

export default async function CreatorPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ retrait?: string }>;
}) {
  const [{ plateforme, pseudo }, { retrait }] = await Promise.all([
    params,
    searchParams,
  ]);
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const creator = await loadCreatorByPath(
    supabase,
    plateforme,
    decodeURIComponent(pseudo),
  );
  if (!creator) notFound();

  const [totals, links, { data: isAdmin }, { data: claim }, { data: recipes }] =
    await Promise.all([
      loadCreatorTotals(supabase, creator.id),
      loadCreatorLinks(supabase, { creatorIds: [creator.id] }),
      supabase.rpc("is_admin"),
      supabase
        .from("creator_claims")
        .select("id, code, status, reason")
        .eq("creator_id", creator.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("recipes")
        .select(
          "id, title, slug, icon, origin, prep_min, cook_min, version_kind, author_id",
        )
        .eq("creator_id", creator.id)
        .eq("visibility", "community")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(60),
    ]);
  const memberId = links.memberOf.get(creator.id) ?? null;
  const isOwner = memberId === user.id;
  const canManage = isOwner || isAdmin === true;

  const [members, stats, rules, removalTarget] = await Promise.all([
    loadMembers(supabase, memberId ? [memberId] : []),
    canManage
      ? loadCreatorPostStats(supabase, creator.id)
      : Promise.resolve([]),
    loadFoodRules(supabase, user.id),
    retrait && isUuid(retrait)
      ? supabase
          .from("recipes")
          .select("id, title")
          .eq("id", retrait)
          .eq("creator_id", creator.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const member = memberId ? members.get(memberId) : undefined;
  // Her own recipes first: her official versions.
  const list = [...(recipes ?? [])].sort(
    (a, b) =>
      Number(b.author_id === memberId && memberId !== null) -
      Number(a.author_id === memberId && memberId !== null),
  );
  const statuses = await verdictStatuses(
    supabase,
    rules,
    list.map((r) => r.id),
  );

  const claimState: ClaimState =
    claim?.status === "pending"
      ? { kind: "pending", claimId: claim.id, code: claim.code }
      : claim?.status === "rejected"
        ? { kind: "rejected", reason: claim.reason }
        : { kind: "none" };
  const posts: SpacePost[] = stats.map((post) => ({
    key: post.key,
    url: post.url,
    title: post.title,
    saved: post.imports + post.saves,
    cooked: post.cooks,
    clicks: post.clicks,
    withdrawn: post.withdrawn,
  }));
  const platformName = t.platforms[creator.platform];

  return (
    <section className="flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-ink-50 uppercase">
          {platformName}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight break-all">
            {creator.label}
          </h1>
          {creator.verified && <VerifiedBadge />}
        </div>
        <p className="text-sm text-ink-70">
          {[
            count(totals.posts, p.postsOne, p.posts),
            count(totals.saved, p.savedOne, p.saved),
            count(totals.cooked, p.cookedOne, p.cooked),
          ].join(" · ")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <a href={creator.profileUrl} target="_blank" rel="noopener">
              {creator.platform === "web"
                ? p.viewSite
                : p.viewAccount.replace("{platform}", platformName)}
              <ExternalLink />
            </a>
          </Button>
          {member && (
            <Button asChild size="sm" variant="ghost">
              <Link href={profileHref(member)}>
                <UserRound />
                {p.onCopine}
              </Link>
            </Button>
          )}
        </div>
      </header>

      {canManage && (
        <CreatorSpace
          creatorId={creator.id}
          label={creator.label}
          importsBlocked={creator.importsBlocked}
          posts={posts}
          canPublish={isOwner}
        />
      )}

      <section
        aria-labelledby="creator-recipes"
        className="flex flex-col gap-2"
      >
        <h2 id="creator-recipes" className="font-display text-lg font-semibold">
          {p.recipes}
        </h2>
        {list.length === 0 ? (
          <p className="text-sm text-ink-50">{p.recipesEmpty}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {list.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard
                  recipe={recipe as RecipeCardData}
                  verdict={statuses.get(recipe.id) ?? null}
                  tag={
                    memberId !== null && recipe.author_id === memberId
                      ? p.officialTag
                      : null
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {!creator.verified && (
        <ClaimPanel
          creatorId={creator.id}
          platform={creator.platform}
          initial={claimState}
        />
      )}

      {!isOwner && (
        <RemovalRequest
          creatorId={creator.id}
          recipe={removalTarget.data ?? null}
        />
      )}
    </section>
  );
}
