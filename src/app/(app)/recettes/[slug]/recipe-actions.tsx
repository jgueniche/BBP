"use client";

import { GitFork, Megaphone, Pencil, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createPost } from "@/app/(app)/communaute/actions";
import {
  createProteinVersion,
  deleteRecipe,
  forkRecipe,
} from "@/app/(app)/recettes/actions";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

const t = fr.recettes;

export function RecipeActions({
  recipeId,
  slug,
  isOwner,
  canGenerateProtein,
}: {
  recipeId: string;
  slug: string;
  isOwner: boolean;
  canGenerateProtein: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onFork() {
    setBusy(true);
    try {
      const result = await forkRecipe(recipeId);
      toast(t.forked);
      router.push(`/recettes/${result.slug}`);
    } finally {
      setBusy(false);
    }
  }

  async function onGenerateProtein() {
    setBusy(true);
    toast(t.generating);
    try {
      const result = await createProteinVersion(recipeId);
      if (!result.ok) {
        toast(t.generateFailed);
        return;
      }
      toast(t.generated);
      router.push(`/recettes/${result.slug}`);
    } catch {
      toast(t.generateFailed);
    } finally {
      setBusy(false);
    }
  }

  async function onShareToFeed() {
    const text = window.prompt(t.sharePrompt);
    if (text === null || text.trim().length < 2) return;
    setBusy(true);
    try {
      const result = await createPost({
        text: text.trim(),
        kind: "recipe",
        recipeId,
        groupId: null,
      });
      if (!result.ok) {
        toast(
          result.code === "moderation"
            ? fr.communaute.composer.blockedPrefix
            : t.saveError,
        );
        return;
      }
      toast(t.sharedToFeed);
      router.push("/communaute");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!window.confirm(t.deleteConfirm)) return;
    setBusy(true);
    try {
      await deleteRecipe(recipeId);
      router.push("/recettes");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={onFork} disabled={busy}>
        <GitFork />
        {t.fork}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={onShareToFeed}
        disabled={busy}
      >
        <Megaphone />
        {t.shareToFeed}
      </Button>
      {canGenerateProtein && (
        <Button size="sm" onClick={onGenerateProtein} disabled={busy}>
          <Sparkles />
          {t.generateProtein}
        </Button>
      )}
      {isOwner && (
        <>
          <Button asChild variant="outline" size="sm">
            <Link href={`/recettes/${slug}/modifier`}>
              <Pencil />
              {t.edit}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} disabled={busy}>
            <Trash2 />
            {t.delete}
          </Button>
        </>
      )}
    </div>
  );
}
