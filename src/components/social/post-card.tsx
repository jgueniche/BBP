"use client";

import {
  ChevronRight,
  Flag,
  MessageCircle,
  MoreHorizontal,
  Send,
  Trash2,
  UserMinus,
  UserPlus,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  addPostComment,
  blockUser,
  deletePost,
  deletePostComment,
  getPostComments,
  reportContent,
  setReaction,
  toggleFollow,
  type PostCommentItem,
} from "@/app/(app)/communaute/actions";
import { fr } from "@/i18n/fr";
import { cn } from "@/lib/utils/cn";

const t = fr.communaute.post;

const REACTION_EMOJI = {
  bsahtek: "🧡",
  mabrouk: "⭐",
  yaouili: "😮",
} as const;

export type ReactionKind = keyof typeof REACTION_EMOJI;

export type FeedPost = {
  id: string;
  kind: string;
  text: string | null;
  createdAt: string;
  authorId: string;
  authorName: string | null;
  isOwn: boolean;
  moderation: string;
  groupName: string | null;
  groupSlug: string | null;
  recipe: { slug: string; title: string; icon: string | null } | null;
  stats: {
    bsahtek: number;
    mabrouk: number;
    yaouili: number;
    comments: number;
  };
  myReaction: ReactionKind | null;
  amFollowing: boolean;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function PostCard({
  post,
  currentUserId,
}: {
  post: FeedPost;
  currentUserId: string;
}) {
  const router = useRouter();
  const [myReaction, setMyReaction] = useState(post.myReaction);
  const [stats, setStats] = useState(post.stats);
  const [following, setFollowing] = useState(post.amFollowing);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostCommentItem[] | null>(null);
  const [commentText, setCommentText] = useState("");

  const kindLabel =
    post.kind !== "text"
      ? fr.communaute.composer.kinds[
          post.kind as keyof typeof fr.communaute.composer.kinds
        ]
      : null;

  async function onReact(kind: ReactionKind) {
    const previous = myReaction;
    const next = previous === kind ? null : kind;
    setMyReaction(next);
    setStats((s) => {
      const updated = { ...s };
      if (previous) updated[previous] -= 1;
      if (next) updated[next] += 1;
      return updated;
    });
    const result = await setReaction(post.id, next);
    if (!result.ok) {
      setMyReaction(previous);
      setStats(post.stats);
    }
  }

  async function openComments() {
    setCommentsOpen((open) => !open);
    if (comments === null) {
      setComments(await getPostComments(post.id));
    }
  }

  async function submitComment(event: React.FormEvent) {
    event.preventDefault();
    const result = await addPostComment(post.id, commentText);
    if (!result.ok) {
      toast(
        result.code === "moderation"
          ? fr.communaute.composer.blockedPrefix
          : fr.recettes.saveError,
      );
      return;
    }
    setComments((prev) => [
      ...(prev ?? []),
      { ...result.comment, authorName: null },
    ]);
    setStats((s) => ({ ...s, comments: s.comments + 1 }));
    setCommentText("");
  }

  async function onFollow() {
    const result = await toggleFollow(post.authorId);
    if (result.ok) {
      setFollowing(result.following);
      if (result.following) toast(t.followed);
    }
    setMenuOpen(false);
  }

  async function onBlock() {
    await blockUser(post.authorId);
    toast(t.blockedToast);
    setMenuOpen(false);
    router.refresh();
  }

  async function onReport() {
    const reason = window.prompt(t.reportPrompt);
    if (!reason || reason.trim().length < 3) return;
    await reportContent({
      targetKind: "post",
      targetId: post.id,
      reason,
    });
    toast(t.reported);
    setMenuOpen(false);
  }

  async function onDelete() {
    await deletePost(post.id);
    router.refresh();
  }

  return (
    <article className="rounded-[20px] border-2 border-ink bg-paper p-3 shadow-sticker-sm">
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">
            <Link href={`/communaute/membre/${post.authorId}`}>
              {post.authorName ?? fr.communaute.member.anonymous}
            </Link>
            {post.groupSlug && post.groupName && (
              <span className="font-medium text-ink-50">
                {" "}
                {t.inGroup}{" "}
                <Link
                  href={`/communaute/groupes/${post.groupSlug}`}
                  className="underline underline-offset-2"
                >
                  {post.groupName}
                </Link>
              </span>
            )}
          </p>
          <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-50">
            {timeAgo(post.createdAt)}
            {kindLabel && (
              <span className="rounded-full bg-ink-10 px-1.5 py-0.5 font-semibold text-ink-70">
                {kindLabel}
              </span>
            )}
            {post.moderation === "flagged" && post.isOwn && (
              <span className="rounded-full bg-warn/15 px-1.5 py-0.5 font-semibold text-warn">
                {t.flaggedNotice}
              </span>
            )}
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="rounded-full p-1 text-ink-50 hover:bg-ink-10"
          >
            <MoreHorizontal size={16} strokeWidth={2} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 flex w-52 flex-col rounded-[14px] border-2 border-ink bg-paper py-1 text-sm shadow-sticker">
              {post.isOwn ? (
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-ink-10"
                >
                  <Trash2 size={14} strokeWidth={2} aria-hidden />
                  {t.delete}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onFollow}
                    className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-ink-10"
                  >
                    {following ? (
                      <UserMinus size={14} strokeWidth={2} aria-hidden />
                    ) : (
                      <UserPlus size={14} strokeWidth={2} aria-hidden />
                    )}
                    {following ? t.unfollow : t.follow}
                  </button>
                  <button
                    type="button"
                    onClick={onReport}
                    className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-ink-10"
                  >
                    <Flag size={14} strokeWidth={2} aria-hidden />
                    {t.report}
                  </button>
                  <button
                    type="button"
                    onClick={onBlock}
                    className="flex items-center gap-2 px-3 py-1.5 text-left text-warn hover:bg-ink-10"
                  >
                    <UserX size={14} strokeWidth={2} aria-hidden />
                    {t.block}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {post.text && (
        <p className="mt-2 whitespace-pre-wrap text-sm">{post.text}</p>
      )}

      {post.recipe && (
        <Link
          href={`/recettes/${post.recipe.slug}`}
          className="mt-2 flex items-center gap-2 rounded-[14px] border-2 border-ink-10 bg-paper px-3 py-2 text-sm font-semibold hover:border-ink"
        >
          {post.recipe.icon && (
            <span className="text-xl leading-none" aria-hidden>
              {post.recipe.icon}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate">{post.recipe.title}</span>
          <span className="flex shrink-0 items-center gap-0.5 text-xs text-ink-50">
            {t.viewRecipe}
            <ChevronRight size={13} strokeWidth={2} aria-hidden />
          </span>
        </Link>
      )}

      <footer className="mt-2.5 flex items-center gap-1.5">
        {(Object.keys(REACTION_EMOJI) as ReactionKind[]).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => onReact(kind)}
            aria-pressed={myReaction === kind}
            aria-label={t.reactions[kind]}
            className={cn(
              "flex items-center gap-1 rounded-full border-2 px-2 py-1 text-xs font-bold transition-transform active:scale-110",
              myReaction === kind
                ? "border-ink bg-boutargue-soft"
                : "border-ink-10 bg-paper",
            )}
          >
            <span aria-hidden>{REACTION_EMOJI[kind]}</span>
            {stats[kind] > 0 && (
              <span className="font-mono">{stats[kind]}</span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={openComments}
          aria-expanded={commentsOpen}
          className="ml-auto flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-ink-70 hover:bg-ink-10"
        >
          <MessageCircle size={14} strokeWidth={2} aria-hidden />
          {stats.comments > 0 && (
            <span className="font-mono">{stats.comments}</span>
          )}
          {t.comments}
        </button>
      </footer>

      {commentsOpen && (
        <div className="mt-2 border-t-2 border-ink-10 pt-2">
          {comments === null ? (
            <p className="text-xs text-ink-50">…</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {comments.map((comment) => (
                <li key={comment.id} className="text-sm">
                  <span className="font-bold">
                    {comment.author_id === currentUserId
                      ? fr.recettes.social.you
                      : (comment.authorName ?? fr.communaute.member.anonymous)}
                  </span>{" "}
                  {comment.text}
                  {comment.author_id === currentUserId && (
                    <button
                      type="button"
                      onClick={async () => {
                        await deletePostComment(comment.id);
                        setComments(
                          (prev) =>
                            prev?.filter((c) => c.id !== comment.id) ?? null,
                        );
                        setStats((s) => ({ ...s, comments: s.comments - 1 }));
                      }}
                      aria-label={t.delete}
                      className="ml-1 align-middle text-ink-30 hover:text-ink-70"
                    >
                      <Trash2 size={12} strokeWidth={2} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={submitComment}
            className="mt-2 flex items-center gap-2"
          >
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t.commentPlaceholder}
              maxLength={500}
              className="min-w-0 flex-1 rounded-[12px] border-2 border-ink bg-paper px-2.5 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={commentText.trim().length === 0}
              aria-label={t.send}
              className="rounded-full border-2 border-ink bg-boutargue p-1.5 text-paper shadow-sticker-sm disabled:opacity-40"
            >
              <Send size={14} strokeWidth={2} />
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
