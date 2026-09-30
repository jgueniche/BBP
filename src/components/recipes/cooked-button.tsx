"use client";

import { ChefHat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { logCook } from "@/app/(app)/recettes/journal-actions";
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
import { Input } from "@/components/ui/input";
import { fr } from "@/i18n/fr";
import { removeUploadedPhotos, uploadPostPhotos } from "@/lib/social/upload";
import { todayIn } from "@/lib/utils/local-date";

const t = fr.recettes.cooked;
const c = fr.communaute.composer;

/**
 * « J'ai cuisiné »: always a private journal entry; sharing also shows the
 * version to the community, with its photos.
 */
export function CookedButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [cookedOn, setCookedOn] = useState(() => todayIn());
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [pending, setPending] = useState(false);

  async function submit(share: boolean) {
    setPending(true);
    let photoPaths: string[] = [];
    try {
      if (share) {
        try {
          photoPaths = await uploadPostPhotos(photos.map((p) => p.file));
        } catch {
          toast(c.photoFailed);
          return;
        }
      }
      const result = await logCook({
        recipeId,
        cookedOn,
        text: text.trim(),
        share,
        photoPaths,
      });
      if (!result.ok) {
        await removeUploadedPhotos(photoPaths);
        toast(
          result.code === "moderation"
            ? `${c.blockedPrefix} (${(result.reasons ?? []).join(", ")}).`
            : result.code === "date"
              ? t.invalidDate
              : fr.recettes.saveError,
        );
        return;
      }
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      setText("");
      setOpen(false);
      toast(result.shared ? t.published : t.kept);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          setCookedOn(todayIn());
          setOpen(true);
        }}
      >
        <ChefHat />
        {t.cta}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.dialogTitle}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit(true);
            }}
            className="flex flex-col gap-3"
          >
            <label className="flex items-center gap-2 text-sm font-semibold">
              {t.dateLabel}
              <Input
                type="date"
                value={cookedOn}
                max={todayIn()}
                min="2000-01-01"
                onChange={(event) => setCookedOn(event.target.value)}
                className="w-44"
                required
              />
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.placeholder}
              rows={3}
              maxLength={1000}
              aria-label={t.placeholder}
              className="rounded-[10px] border bg-card px-3 py-2 text-sm"
            />
            <PhotoPicker
              photos={photos}
              onChange={setPhotos}
              disabled={pending}
            />
            <p className="text-xs text-ink-50">
              {photos.length > 0 ? t.photosNeedShare : t.shareHint}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={pending || photos.length > 0}
                onClick={() => void submit(false)}
              >
                {t.keep}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? c.publishing : t.publish}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
