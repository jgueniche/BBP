"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createGroup } from "@/app/(app)/communaute/actions";
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
import { cn } from "@/lib/utils/cn";

const t = fr.communaute.groups;

const ICONS = ["👥", "🏙️", "🥘", "💪", "🕯️", "🏃", "🧁", "⚽", "🎯", "❤️"];

export function GroupDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("👥");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await createGroup({
        name: name.trim(),
        description: description.trim() || null,
        icon,
      });
      if (!result.ok) {
        toast(fr.recettes.saveError);
        return;
      }
      setOpen(false);
      router.push(`/communaute/groupes/${result.slug}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Plus />
          {t.create}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.create}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={submit}
          className="flex flex-col gap-3 text-sm font-medium"
        >
          <label className="flex flex-col gap-1.5">
            {t.name}
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              maxLength={60}
              required
            />
          </label>
          <div className="flex flex-col gap-1.5">
            {t.icon}
            <div className="flex flex-wrap gap-1">
              {ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  aria-pressed={icon === emoji}
                  className={cn(
                    "rounded-[10px] border-2 px-1.5 py-0.5 text-xl leading-none",
                    icon === emoji
                      ? "border-ink bg-boutargue-soft"
                      : "border-transparent hover:border-ink-30",
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            {t.descriptionField}
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
            />
          </label>
          <Button type="submit" disabled={pending || name.trim().length < 2}>
            {t.submit}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
