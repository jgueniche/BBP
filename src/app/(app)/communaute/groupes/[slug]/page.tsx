import { Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { PostCard } from "@/components/social/post-card";
import { PostComposer } from "@/components/social/post-composer";
import { fr } from "@/i18n/fr";
import { loadFeedPosts } from "@/lib/social/feed";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { MembershipButton } from "./membership-button";

const t = fr.communaute.groups;

export default async function GroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: group } = await supabase
    .from("groups")
    .select("id, slug, name, icon, description")
    .eq("slug", slug)
    .maybeSingle();
  if (!group) notFound();

  const [{ data: membership }, { count: memberCount }, posts] =
    await Promise.all([
      supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", group.id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("group_members")
        .select("user_id", { count: "exact", head: true })
        .eq("group_id", group.id),
      loadFeedPosts(supabase, user.id, { groupId: group.id }),
    ]);
  const isMember = membership !== null;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <span className="text-4xl leading-none" aria-hidden>
          {group.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            {group.name}
          </h1>
          <p className="flex items-center gap-1 text-xs text-ink-50">
            <Users size={13} strokeWidth={2} aria-hidden />
            {memberCount ?? 0}{" "}
            {(memberCount ?? 0) === 1 ? t.memberLabel : t.membersLabel}
          </p>
        </div>
        <MembershipButton groupId={group.id} isMember={isMember} />
      </header>
      {group.description && (
        <p className="text-sm text-ink-70">{group.description}</p>
      )}

      {isMember ? (
        <PostComposer groupId={group.id} />
      ) : (
        <p className="rounded-[16px] border-2 border-ink-10 px-3 py-2 text-sm text-ink-50">
          {t.notMember}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={user.id} />
        ))}
      </div>
    </section>
  );
}
