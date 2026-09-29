"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef } from "react";

import { fr } from "@/i18n/fr";
import { MAX_POST_PHOTOS } from "@/lib/social/photos";

const t = fr.communaute.composer;

export type PickedPhoto = { file: File; preview: string };

/** Local photo selection with previews; nothing leaves the device here. */
export function PhotoPicker({
  photos,
  onChange,
  disabled,
}: {
  photos: PickedPhoto[];
  onChange: (next: PickedPhoto[]) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);

  function add(files: FileList | null) {
    if (!files) return;
    const room = MAX_POST_PHOTOS - photos.length;
    const next = [...files]
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, room)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    onChange([...photos, ...next]);
  }

  function remove(index: number) {
    URL.revokeObjectURL(photos[index]!.preview);
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {photos.map((photo, index) => (
          <div key={photo.preview} className="relative size-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.preview}
              alt=""
              className="size-16 rounded-[10px] object-cover"
            />
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={t.removePhoto}
              className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border bg-card text-ink-70"
            >
              <X size={12} strokeWidth={2} aria-hidden />
            </button>
          </div>
        ))}
        {photos.length < MAX_POST_PHOTOS && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => input.current?.click()}
            className="flex h-8 items-center gap-1 rounded-full border bg-card px-2.5 text-xs font-semibold text-ink-70"
          >
            <ImagePlus size={14} strokeWidth={2} aria-hidden />
            {t.addPhoto}
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            add(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      <p className="text-[11px] text-ink-50">{t.photoHint}</p>
    </div>
  );
}
