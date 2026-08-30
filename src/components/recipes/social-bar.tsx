"use client";

import { motion, useReducedMotion } from "motion/react";
import { Bookmark, FolderPlus, Heart, Plus, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import {
  listCollectionsForRecipe,
  toggleRecipeInCollection,
  type CollectionForPicker,
} from "@/app/(app)/recettes/collection-actions";
import { toggleLike, toggleSave } from "@/app/(app)/recettes/social-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fr } from "@/i18n/fr";
import { cn } from "@/lib/utils/cn";

const t = fr.recettes;

export function SocialBar({
  recipeId,
  initialLiked,
  initialSaved,
  initialLikes,
  publicSlug = null,
}: {
  recipeId: string;
  initialLiked: boolean;
  initialSaved: boolean;
  initialLikes: number;
  publicSlug?: string | null;
}) {
  const reducedMotion = useReducedMotion();
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [saved, setSaved] = useState(initialSaved);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [collections, setCollections] = useState<CollectionForPicker[] | null>(
    null,
  );

  async function onLike() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    const result = await toggleLike(recipeId);
    if (!result.ok) {
      setLiked(!next);
      setLikes((n) => n - (next ? 1 : -1));
    }
  }

  async function onSave() {
    const next = !saved;
    setSaved(next);
    const result = await toggleSave(recipeId);
    if (!result.ok) {
      setSaved(!next);
      return;
    }
    toast(next ? t.social.saved : t.social.unsaved);
  }

  async function openPicker(open: boolean) {
    setPickerOpen(open);
    if (open && collections === null) {
      setCollections(await listCollectionsForRecipe(recipeId));
    }
  }

  async function onToggleCollection(collection: CollectionForPicker) {
    setCollections(
      (prev) =>
        prev?.map((c) =>
          c.id === collection.id ? { ...c, hasRecipe: !c.hasRecipe } : c,
        ) ?? null,
    );
    try {
      await toggleRecipeInCollection({
        collectionId: collection.id,
        recipeId,
      });
    } catch {
      setCollections(
        (prev) =>
          prev?.map((c) =>
            c.id === collection.id
              ? { ...c, hasRecipe: collection.hasRecipe }
              : c,
          ) ?? null,
      );
    }
  }

  return (
    <div className="flex items-center gap-2">
      <motion.button
        type="button"
        onClick={onLike}
        aria-label={t.social.likeAria}
        aria-pressed={liked}
        whileTap={reducedMotion ? undefined : { scale: 1.25 }}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold shadow-soft",
          liked ? "bg-boutargue-tint" : "bg-card",
        )}
      >
        <Heart
          size={16}
          strokeWidth={2}
          className={cn(liked && "fill-boutargue text-boutargue")}
          aria-hidden
        />
        {likes}
      </motion.button>

      <button
        type="button"
        onClick={onSave}
        aria-label={t.social.saveAria}
        aria-pressed={saved}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold shadow-soft",
          saved ? "bg-ink text-paper" : "bg-card",
        )}
      >
        <Bookmark
          size={16}
          strokeWidth={2}
          className={cn(saved && "fill-current")}
          aria-hidden
        />
        {t.tabs.book}
      </button>

      {publicSlug && (
        <button
          type="button"
          onClick={async () => {
            const url = `${window.location.origin}/r/${publicSlug}`;
            try {
              if (navigator.share) {
                await navigator.share({ url });
                return;
              }
            } catch {
              // Share sheet dismissed — copy instead.
            }
            await navigator.clipboard.writeText(url);
            toast(fr.recettes.shareExternalCopied);
          }}
          aria-label={fr.recettes.shareExternal}
          className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-bold shadow-soft"
        >
          <Share2 size={16} strokeWidth={2} aria-hidden />
        </button>
      )}

      <Dialog open={pickerOpen} onOpenChange={openPicker}>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={t.collections.addTo}
            className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-bold shadow-soft"
          >
            <FolderPlus size={16} strokeWidth={2} aria-hidden />
            {t.tabs.collections}
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.collections.addTo}</DialogTitle>
          </DialogHeader>
          {collections === null ? (
            <p className="text-sm text-ink-50">…</p>
          ) : collections.length === 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-70">{t.collections.pickerEmpty}</p>
              <Button asChild variant="secondary" size="sm">
                <Link href="/recettes?tab=carnets">
                  <Plus />
                  {t.collections.new}
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {collections.map((collection) => (
                <li key={collection.id}>
                  <button
                    type="button"
                    onClick={() => onToggleCollection(collection)}
                    aria-pressed={collection.hasRecipe}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[10px] border px-3 py-2 text-left text-sm font-semibold",
                      collection.hasRecipe
                        ? "border-ink bg-boutargue-tint"
                        : "bg-card",
                    )}
                  >
                    <span className="text-xl leading-none" aria-hidden>
                      {collection.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {collection.name}
                    </span>
                    {collection.hasRecipe && <span aria-hidden>✓</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
