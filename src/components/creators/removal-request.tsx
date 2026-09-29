"use client";

import { Flag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { reportContent } from "@/app/(app)/communaute/actions";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

const p = fr.creators.page;

/**
 * « Demander un retrait »: a request to the team, about one copy (from its
 * recipe page) or about the whole profile.
 */
export function RemovalRequest({
  creatorId,
  recipe,
}: {
  creatorId: string;
  /** The copy the request is about, when it comes from its page. */
  recipe: { id: string; title: string } | null;
}) {
  const [open, setOpen] = useState(recipe !== null);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await reportContent({
        targetKind: recipe ? "recipe" : "creator",
        targetId: recipe?.id ?? creatorId,
        reason: text,
      });
      if (!result.ok) throw new Error("report failed");
      setSent(true);
      toast(p.removalSent);
    } catch {
      toast(fr.creators.claim.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <section id="retrait" className="flex scroll-mt-6 flex-col gap-2">
      {sent ? (
        <p className="text-sm text-ink-70">{p.removalSent}</p>
      ) : open ? (
        <form
          onSubmit={submit}
          className="flex flex-col gap-2 rounded-lg border bg-card p-4"
        >
          {recipe && (
            <p className="text-xs font-semibold text-ink-70">
              {p.removalAbout.replace("{title}", recipe.title)}
            </p>
          )}
          <label htmlFor="removal-reason" className="text-sm font-medium">
            {p.removalPrompt}
          </label>
          <textarea
            id="removal-reason"
            value={text}
            onChange={(event) => setText(event.target.value)}
            minLength={3}
            maxLength={300}
            rows={3}
            required
            className="rounded-[10px] border bg-card px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={pending || text.trim().length < 3}
            >
              {p.removalSend}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              {p.removalCancel}
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
            <Flag />
            {p.removalCta}
          </Button>
        </div>
      )}
    </section>
  );
}
