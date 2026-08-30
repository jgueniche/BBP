"use client";

import { Send, Trash2 } from "lucide-react";
import { useState } from "react";

import { addComment, deleteComment } from "@/app/(app)/recettes/social-actions";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

const t = fr.recettes.social;

export type CommentItem = {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  authorName: string | null;
};

export function CommentsSection({
  recipeId,
  currentUserId,
  isRecipeAuthor,
  initialComments,
}: {
  recipeId: string;
  currentUserId: string;
  isRecipeAuthor: boolean;
  initialComments: CommentItem[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (text.trim().length === 0) return;
    setPending(true);
    try {
      const result = await addComment(recipeId, text);
      setComments((prev) => [...prev, { ...result.comment, authorName: null }]);
      setText("");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteComment(id);
    } catch {
      // The next navigation refetches the truth; keep it simple here.
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-extrabold">
        {t.comments}
        {comments.length > 0 && (
          <span className="ml-1.5 font-mono text-sm text-ink-50">
            {comments.length}
          </span>
        )}
      </h2>

      {comments.length === 0 ? (
        <p className="text-sm text-ink-50">{t.commentsEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-[16px] border-2 border-ink-10 bg-paper px-3 py-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-bold text-ink-70">
                  {comment.user_id === currentUserId
                    ? t.you
                    : (comment.authorName ?? fr.recettes.authorHidden)}
                </p>
                {(comment.user_id === currentUserId || isRecipeAuthor) && (
                  <button
                    type="button"
                    onClick={() => remove(comment.id)}
                    aria-label={t.commentDelete}
                    className="rounded-full p-0.5 text-ink-30 hover:text-ink-70"
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-sm">{comment.text}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.commentPlaceholder}
          rows={2}
          maxLength={500}
          className="flex-1 rounded-[14px] border-2 border-ink bg-paper px-3 py-2 text-sm"
        />
        <Button
          type="submit"
          size="sm"
          disabled={pending || text.trim().length === 0}
          aria-label={t.commentSend}
        >
          <Send />
        </Button>
      </form>
    </section>
  );
}
