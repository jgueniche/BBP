"use client";

import { Camera, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { MemberAvatar } from "@/components/social/member-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { fr } from "@/i18n/fr";
import { uploadAvatar } from "@/lib/social/avatar-client";
import { normalizeHandle, profileHref } from "@/lib/social/handles";
import { BIO_MAX, DISPLAY_NAME_MAX } from "@/lib/social/profile";

import {
  removeAvatar,
  saveProfile,
  setAvatar,
  updateProfileVisibility,
} from "./actions";

const t = fr.profil.profileCard;
const v = fr.profil.visibility;

type Field = "displayName" | "handle" | "bio";

export function ProfileCard({
  userId,
  initial,
}: {
  userId: string;
  initial: {
    displayName: string;
    handle: string | null;
    bio: string | null;
    avatarUrl: string | null;
    isPublic: boolean;
  };
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [handle, setHandle] = useState(initial.handle ?? "");
  const [savedHandle, setSavedHandle] = useState(initial.handle);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [isPublic, setIsPublic] = useState(initial.isPublic);
  const [error, setError] = useState<{ field?: Field; text: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [photoPending, setPhotoPending] = useState(false);

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await saveProfile({ displayName, handle, bio });
      if (!result.ok) {
        setError({ field: result.field, text: t.errors[result.code] });
        return;
      }
      setSavedHandle(result.handle);
      setHandle(result.handle ?? "");
      toast(t.saved);
      router.refresh();
    } catch {
      setError({ text: t.errors.error });
    } finally {
      setPending(false);
    }
  }

  async function onPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setPhotoPending(true);
    try {
      const path = await uploadAvatar(file);
      const result = await setAvatar(path);
      if (!result.ok) throw new Error("not saved");
      toast(t.photoSaved);
      router.refresh();
    } catch {
      toast(t.photoFailed);
    } finally {
      setPhotoPending(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function onRemovePhoto() {
    setPhotoPending(true);
    try {
      await removeAvatar();
      router.refresh();
    } finally {
      setPhotoPending(false);
    }
  }

  async function onVisibility(next: boolean) {
    setIsPublic(next);
    try {
      await updateProfileVisibility(next);
      toast(v.saved);
      router.refresh();
    } catch {
      setIsPublic(!next);
    }
  }

  const preview = normalizeHandle(handle);

  return (
    <div id="mon-profil" className="scroll-mt-6 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold">{v.title}</h2>
        <Link
          href={profileHref({ id: userId, handle: savedHandle })}
          className="inline-flex items-center gap-1 text-xs font-semibold text-boutargue-deep underline-offset-2 hover:underline"
        >
          {t.viewProfile}
          <ExternalLink size={12} strokeWidth={2} aria-hidden />
        </Link>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <MemberAvatar
          id={userId}
          name={displayName}
          avatarUrl={initial.avatarUrl}
          size="lg"
        />
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="xs"
              variant="secondary"
              disabled={photoPending}
              onClick={() => fileInput.current?.click()}
            >
              <Camera />
              {initial.avatarUrl ? t.changePhoto : t.addPhoto}
            </Button>
            {initial.avatarUrl && (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                disabled={photoPending}
                onClick={onRemovePhoto}
              >
                <Trash2 />
                {t.removePhoto}
              </Button>
            )}
          </div>
          <p className="max-w-xs text-[11px] text-ink-50">{t.photoHint}</p>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            aria-label={t.photo}
            className="hidden"
            onChange={(event) => onPhoto(event.target.files)}
          />
        </div>
      </div>

      <form onSubmit={onSave} className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t.name}
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={DISPLAY_NAME_MAX}
            aria-invalid={error?.field === "displayName"}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t.handle}
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-ink-50" aria-hidden>
              @
            </span>
            <Input
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              maxLength={40}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={error?.field === "handle"}
              aria-describedby="handle-hint"
            />
          </span>
          <span
            id="handle-hint"
            className="text-[11px] font-normal text-ink-50"
          >
            {preview && preview !== handle ? `@${preview} · ` : ""}
            {t.handleHint}
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t.bio}
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={BIO_MAX}
            rows={3}
            placeholder={t.bioPlaceholder}
            aria-invalid={error?.field === "bio"}
            className="rounded-[10px] border bg-card px-3 py-2 text-sm font-normal"
          />
          <span className="self-end font-mono text-[11px] font-normal text-ink-50">
            {bio.length}/{BIO_MAX}
          </span>
        </label>
        {error && (
          <p role="alert" className="text-sm font-semibold text-warn">
            {error.text}
          </p>
        )}
        <Button type="submit" size="sm" disabled={pending} className="self-end">
          {pending ? t.saving : t.save}
        </Button>
      </form>

      <div className="mt-4 flex items-start justify-between gap-3 border-t pt-3">
        <div>
          <p className="text-sm font-semibold">{v.label}</p>
          <p className="text-xs text-ink-50">{v.hint}</p>
        </div>
        <Switch checked={isPublic} onChange={onVisibility} label={v.label} />
      </div>
    </div>
  );
}
