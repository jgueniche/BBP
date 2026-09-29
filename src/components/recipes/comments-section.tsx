"use client";

import { Send, ThumbsUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  addComment,
  deleteComment,
  toggleTipVote,
} from "@/app/(app)/recettes/social-actions";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import { sortTips } from "@/lib/social/tips";
import { cn } from "@/lib/utils/cn";

const t = fr.recettes.tips;
const s = fr.recettes.social;

export type CommentItem = {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  authorName: string | null;
  helpful: number;
  votedByMe: boolean;
};

/** Tips under a recipe, most voted « utile » first. */
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
  const [tips, setTips] = useState(() => sortTips(initialComments));
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (text.trim().length === 0) return;
    setPending(true);
    try {
      const result = await addComment(recipeId, text);
      if (!result.ok) {
        toast(t.blocked);
        return;
      }
      setTips((prev) => [
        ...prev,
        { ...result.comment, authorName: null, helpful: 0, votedByMe: false },
      ]);
      setText("");
    } finally {
      setPending(false);
    }
  }

  async function vote(id: string) {
    setTips((prev) =>
      prev.map((tip) =>
        tip.id === id
          ? {
              ...tip,
              votedByMe: !tip.votedByMe,
              helpful: tip.helpful + (tip.votedByMe ? -1 : 1),
            }
          : tip,
      ),
    );
    try {
      await toggleTipVote(id);
    } catch {
      // The next navigation refetches the truth.
    }
  }

  async function remove(id: string) {
    setTips((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteComment(id);
    } catch {
      // The next navigation refetches the truth.
    }
  }

  return (
    <section id="astuces" className="flex scroll-mt-20 flex-col gap-2">
      <h2 className="font-display text-lg font-semibold">
        {t.title}
        {tips.length > 0 && (
          <span className="ml-1.5 font-mono text-sm text-ink-50">
            {tips.length}
          </span>
        )}
      </h2>

      {tips.length === 0 ? (
        <p className="text-sm text-ink-50">{t.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tips.map((tip) => {
            const own = tip.user_id === currentUserId;
            return (
              <li key={tip.id} className="rounded-lg border bg-card px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-bold text-ink-70">
                    {own ? s.you : (tip.authorName ?? fr.recettes.authorHidden)}
                  </p>
                  {(own || isRecipeAuthor) && (
                    <button
                      type="button"
                      onClick={() => remove(tip.id)}
                      aria-label={s.commentDelete}
                      className="rounded-full p-0.5 text-ink-30 hover:text-ink-70"
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  )}
                </div>
                <p className="mt-0.5 text-sm">{tip.text}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  {own ? (
                    <span className="text-[11px] text-ink-50">
                      {t.ownTip}
                      {tip.helpful > 0 && ` · ${t.helpful} ${tip.helpful}`}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => vote(tip.id)}
                      aria-pressed={tip.votedByMe}
                      aria-label={t.helpfulAria}
                      className={cn(
                        "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold",
                        tip.votedByMe
                          ? "border-framboise-soft bg-rose text-framboise-deep"
                          : "bg-card text-ink-70",
                      )}
                    >
                      <ThumbsUp size={12} strokeWidth={2} aria-hidden />
                      {t.helpful}
                      {tip.helpful > 0 && (
                        <span className="font-mono">{tip.helpful}</span>
                      )}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={submit} className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.placeholder}
          rows={2}
          maxLength={500}
          className="flex-1 rounded-[10px] border bg-card px-3 py-2 text-sm"
        />
        <Button
          type="submit"
          size="sm"
          disabled={pending || text.trim().length === 0}
          aria-label={s.commentSend}
        >
          <Send />
        </Button>
      </form>
    </section>
  );
}
