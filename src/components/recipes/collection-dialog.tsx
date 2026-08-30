"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  saveCollection,
  type CollectionInput,
} from "@/app/(app)/recettes/collection-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fr } from "@/i18n/fr";
import {
  COLLECTION_COLOR_CLASSES,
  COLLECTION_COLORS,
  type CollectionColor,
} from "@/lib/collections/colors";
import { cn } from "@/lib/utils/cn";

const t = fr.recettes.collections;

const ICON_CHOICES = [
  "📒",
  "🕯️",
  "🍲",
  "🥗",
  "🍰",
  "🥩",
  "🐟",
  "🍞",
  "🎉",
  "👵",
  "💪",
  "⭐",
  "🌶️",
  "🫒",
  "🍋",
  "❤️",
];

export function CollectionDialog({
  trigger,
  initial,
}: {
  trigger: React.ReactNode;
  initial?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "📒");
  const [color, setColor] = useState<CollectionColor>(
    (initial?.color as CollectionColor) ?? "boutargue",
  );
  const [description, setDescription] = useState(initial?.description ?? "");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const payload: CollectionInput = {
        id: initial?.id ?? null,
        name: name.trim(),
        icon,
        color,
        description: description.trim() || null,
      };
      const result = await saveCollection(payload);
      toast(initial ? t.updated : t.create);
      setOpen(false);
      if (!initial) {
        setName("");
        setDescription("");
        router.push(`/recettes/carnets/${result.id}`);
      } else {
        router.refresh();
      }
    } catch {
      toast(fr.recettes.saveError);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? t.editTitle : t.new}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t.name}
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              maxLength={60}
              required
            />
          </label>

          <div className="flex flex-col gap-1.5 text-sm font-medium">
            {t.icon}
            <div className="flex flex-wrap gap-1">
              {ICON_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  aria-pressed={icon === emoji}
                  className={cn(
                    "rounded-[10px] border px-1.5 py-0.5 text-xl leading-none",
                    icon === emoji
                      ? "border-ink bg-boutargue-tint"
                      : "border-transparent hover:border-ink-30",
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-sm font-medium">
            {t.color}
            <div className="flex flex-wrap gap-1.5">
              {COLLECTION_COLORS.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setColor(choice)}
                  aria-label={choice}
                  aria-pressed={color === choice}
                  className={cn(
                    "size-8 rounded-full border",
                    COLLECTION_COLOR_CLASSES[choice],
                    color === choice ? "border-ink" : "border-ink-30",
                  )}
                />
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t.descriptionField}
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
            />
          </label>

          <Button type="submit" disabled={pending || name.trim().length === 0}>
            {initial ? t.save : t.create}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
