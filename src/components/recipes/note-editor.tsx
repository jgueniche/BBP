"use client";

import { NotebookPen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { saveNote } from "@/app/(app)/recettes/social-actions";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

const t = fr.recettes.note;

export function NoteEditor({
  recipeId,
  initialText,
}: {
  recipeId: string;
  initialText: string;
}) {
  const [text, setText] = useState(initialText);
  const [savedText, setSavedText] = useState(initialText);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await saveNote(recipeId, text);
      setSavedText(text.trim());
      toast(t.saved);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-[20px] border-2 border-ink bg-paper p-4 shadow-sticker-sm">
      <h2 className="flex items-center gap-1.5 font-display text-base font-extrabold">
        <NotebookPen size={16} strokeWidth={2} aria-hidden />
        {t.title}
      </h2>
      <form onSubmit={submit} className="mt-2 flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.placeholder}
          rows={3}
          maxLength={2000}
          className="rounded-[14px] border-2 border-ink-10 bg-paper px-3 py-2 text-sm"
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={pending || text.trim() === savedText}
          className="self-start"
        >
          {t.save}
        </Button>
      </form>
    </section>
  );
}
