"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { fr } from "@/i18n/fr";

import { updateProfileVisibility } from "./actions";

const t = fr.profil.visibility;

export function VisibilityCard({ initialPublic }: { initialPublic: boolean }) {
  const [isPublic, setIsPublic] = useState(initialPublic);

  async function save(next: boolean) {
    setIsPublic(next);
    try {
      await updateProfileVisibility(next);
      toast(t.saved);
    } catch {
      setIsPublic(!next);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="font-display text-base font-semibold">{t.title}</h2>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{t.label}</p>
          <p className="text-xs text-ink-50">{t.hint}</p>
        </div>
        <Switch checked={isPublic} onChange={save} label={t.label} />
      </div>
    </div>
  );
}
