import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { PostCard } from "@/components/social/post-card";
import { fr } from "@/i18n/fr";
import { loadFeedPosts } from "@/lib/social/feed";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const t = fr.communaute.member;

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured) return null;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, posts] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, username, bio")
      .eq("id", id)
      .maybeSingle(),
    loadFeedPosts(supabase, user.id, { authorId: id, limit: 30 }),
  ]);

  const name = profile?.display_name ?? profile?.username ?? t.anonymous;

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {name}
        </h1>
        {profile?.bio && (
          <p className="mt-1 text-sm text-ink-70">{profile.bio}</p>
        )}
      </header>

      <h2 className="font-display text-lg font-extrabold">{t.posts}</h2>
      {posts.length === 0 ? (
        <p className="text-sm text-ink-50">{t.noPosts}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={user.id} />
          ))}
        </div>
      )}
    </section>
  );
}
