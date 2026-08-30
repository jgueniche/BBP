import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { fr } from "@/i18n/fr";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { ModerationActions } from "./moderation-item";

const t = fr.communaute.admin;

export default async function ModerationPage() {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    return (
      <section>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {t.title}
        </h1>
        <p className="mt-3 text-sm text-ink-70">{t.notAdmin}</p>
      </section>
    );
  }

  const [{ data: reports }, { data: flaggedPosts }, { data: flaggedComments }] =
    await Promise.all([
      supabase
        .from("reports")
        .select("id, target_kind, target_id, reason, created_at")
        .eq("status", "open")
        .order("created_at")
        .limit(50),
      supabase
        .from("posts")
        .select("id, text, moderation, moderation_reasons")
        .eq("moderation", "flagged")
        .limit(30),
      supabase
        .from("post_comments")
        .select("id, text, moderation, moderation_reasons")
        .eq("moderation", "flagged")
        .limit(30),
    ]);

  const postIds = (reports ?? [])
    .filter((r) => r.target_kind === "post")
    .map((r) => r.target_id);
  const commentIds = (reports ?? [])
    .filter((r) => r.target_kind === "comment")
    .map((r) => r.target_id);
  const [{ data: reportedPosts }, { data: reportedComments }] =
    await Promise.all([
      postIds.length > 0
        ? supabase
            .from("posts")
            .select("id, text, moderation")
            .in("id", postIds)
        : Promise.resolve({ data: [] }),
      commentIds.length > 0
        ? supabase
            .from("post_comments")
            .select("id, text, moderation")
            .in("id", commentIds)
        : Promise.resolve({ data: [] }),
    ]);
  const postById = new Map((reportedPosts ?? []).map((p) => [p.id, p]));
  const commentById = new Map((reportedComments ?? []).map((c) => [c.id, c]));

  return (
    <section className="flex flex-col gap-5">
      <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
        <ShieldCheck size={26} strokeWidth={2} aria-hidden />
        {t.title}
      </h1>

      <div>
        <h2 className="font-display text-lg font-extrabold">{t.openReports}</h2>
        {(reports ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-ink-50">{t.noReports}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {(reports ?? []).map((report) => {
              const content =
                report.target_kind === "post"
                  ? postById.get(report.target_id)
                  : commentById.get(report.target_id);
              return (
                <li
                  key={report.id}
                  className="flex flex-col gap-2 rounded-lg border bg-card p-3"
                >
                  <p className="text-xs text-ink-50">
                    {t.reason} :{" "}
                    <span className="font-semibold">{report.reason}</span>
                  </p>
                  <p className="rounded-[10px] bg-ink-10 px-3 py-2 text-sm">
                    {content?.text ?? t.contentGone}
                  </p>
                  <ModerationActions
                    targetKind={report.target_kind as "post" | "comment"}
                    targetId={content?.id ?? null}
                    reportId={report.id}
                    isBlocked={content?.moderation === "blocked"}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <h2 className="font-display text-lg font-extrabold">
          {t.flaggedTitle}
        </h2>
        {(flaggedPosts ?? []).length === 0 &&
        (flaggedComments ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-ink-50">{t.noFlagged}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {(flaggedPosts ?? []).map((post) => (
              <li
                key={post.id}
                className="flex flex-col gap-2 rounded-lg border border-warn/40 bg-card p-3"
              >
                <p className="text-xs text-ink-50">
                  {post.moderation_reasons.join(", ")}
                </p>
                <p className="rounded-[10px] bg-ink-10 px-3 py-2 text-sm">
                  {post.text}
                </p>
                <ModerationActions
                  targetKind="post"
                  targetId={post.id}
                  isBlocked={false}
                />
              </li>
            ))}
            {(flaggedComments ?? []).map((comment) => (
              <li
                key={comment.id}
                className="flex flex-col gap-2 rounded-lg border border-warn/40 bg-card p-3"
              >
                <p className="text-xs text-ink-50">
                  {comment.moderation_reasons.join(", ")}
                </p>
                <p className="rounded-[10px] bg-ink-10 px-3 py-2 text-sm">
                  {comment.text}
                </p>
                <ModerationActions
                  targetKind="comment"
                  targetId={comment.id}
                  isBlocked={false}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
