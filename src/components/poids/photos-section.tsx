"use client";

import { Camera, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/client";

const t = fr.poids;
const BUCKET = "progress-photos";

type PhotoView = { path: string; url: string };

export function PhotosSection({ userId }: { userId: string }) {
  const [photos, setPhotos] = useState<PhotoView[]>([]);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data: files } = await supabase.storage
      .from(BUCKET)
      .list(userId, { sortBy: { column: "name", order: "desc" }, limit: 24 });
    if (!files || files.length === 0) {
      setPhotos([]);
      return;
    }
    const paths = files.map((f) => `${userId}/${f.name}`);
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, 3600);
    const next: PhotoView[] = [];
    (signed ?? []).forEach((s, i) => {
      if (s.signedUrl) next.push({ path: paths[i]!, url: s.signedUrl });
    });
    setPhotos(next);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`${userId}/${stamp}.jpg`, file, {
          contentType: file.type || "image/jpeg",
        });
      if (error) throw error;
      await refresh();
    } catch {
      toast(t.photoError);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(path: string) {
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.storage.from(BUCKET).remove([path]);
      toast(t.photoDeleted);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-lg font-extrabold">{t.photosTitle}</h2>
        <p className="text-xs text-ink-50">{t.photosHint}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {photos.map((photo) => (
          <figure key={photo.path} className="relative">
            <Image
              src={photo.url}
              alt=""
              width={96}
              height={128}
              unoptimized
              className="h-32 w-24 rounded-lg border object-cover"
            />
            <button
              type="button"
              onClick={() => onDelete(photo.path)}
              aria-label={t.photoDeleted}
              disabled={busy}
              className="absolute -right-2 -top-2 rounded-full border bg-card p-1 text-ink-70"
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          </figure>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="h-32 w-24 flex-col rounded-lg"
        >
          <Camera />
          <span className="text-xs">{t.photosAdd}</span>
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onUpload}
        hidden
      />
    </section>
  );
}
