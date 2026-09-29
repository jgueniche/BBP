"use client";

import { ChefHat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createPost } from "@/app/(app)/communaute/actions";
import {
  PhotoPicker,
  type PickedPhoto,
} from "@/components/social/photo-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fr } from "@/i18n/fr";
import { uploadPostPhotos } from "@/lib/social/upload";

const t = fr.recettes.cooked;
const c = fr.communaute.composer;

/** « J'ai cuisiné »: a photo of your version and a word, tied to the recipe. */
export function CookedButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      let photoPaths: string[] = [];
      try {
        photoPaths = await uploadPostPhotos(photos.map((p) => p.file));
      } catch {
        toast(c.photoFailed);
        return;
      }
      const result = await createPost({
        text: text.trim(),
        kind: "cooked",
        recipeId,
        groupId: null,
        photoPaths,
      });
      if (!result.ok) {
        toast(
          result.code === "moderation"
            ? `${c.blockedPrefix} (${result.reasons.join(", ")}).`
            : fr.recettes.saveError,
        );
        return;
      }
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      setText("");
      setOpen(false);
      toast(t.published);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <ChefHat />
        {t.cta}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.dialogTitle}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.placeholder}
              rows={3}
              maxLength={1000}
              className="rounded-[10px] border bg-card px-3 py-2 text-sm"
            />
            <PhotoPicker
              photos={photos}
              onChange={setPhotos}
              disabled={pending}
            />
            <Button type="submit" disabled={pending} className="self-end">
              {pending ? c.publishing : t.publish}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
