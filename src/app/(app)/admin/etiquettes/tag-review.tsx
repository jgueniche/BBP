"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

import { deleteTag, reviewTag } from "./actions";

const t = fr.communaute.admin;

export function TagReview({
  tag,
}: {
  tag: { id: string; slug: string; label: string };
}) {
  const [synonymOf, setSynonymOf] = useState("");
  const [parent, setParent] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const result = await reviewTag({ tagId: tag.id, synonymOf, parent });
      if (!result.ok) {
        toast(t.unknownTag);
        return;
      }
      setDone(true);
      toast(t.tagSaved);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteTag(tag.id);
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) return null;
  return (
    <li className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm">
      <p className="font-semibold">
        #{tag.label}{" "}
        <span className="font-mono text-xs text-ink-50">{tag.slug}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          value={synonymOf}
          onChange={(e) => setSynonymOf(e.target.value)}
          list="reference-tags"
          placeholder={t.synonymOf}
          aria-label={t.synonymOf}
          className="rounded-[10px] border bg-card px-2.5 py-1 text-sm"
        />
        <input
          value={parent}
          onChange={(e) => setParent(e.target.value)}
          list="reference-tags"
          placeholder={t.parent}
          aria-label={t.parent}
          className="rounded-[10px] border bg-card px-2.5 py-1 text-sm"
        />
        <Button size="sm" onClick={save} disabled={busy}>
          {t.validate}
        </Button>
        <Button size="sm" variant="ghost" onClick={remove} disabled={busy}>
          {t.tagDelete}
        </Button>
      </div>
    </li>
  );
}
