"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { toggleToCook } from "@/app/(app)/recettes/journal-actions";
import { fr } from "@/i18n/fr";

const t = fr.recettes.toCook;

export function ToCookRemoveButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      aria-label={t.remove}
      title={t.remove}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await toggleToCook(recipeId);
        setPending(false);
        if (result.ok) {
          toast(t.removed);
          router.refresh();
        }
      }}
      className="absolute top-2 right-2 rounded-full border bg-card p-1 text-ink-50 shadow-soft hover:text-ink disabled:opacity-50"
    >
      <X size={14} strokeWidth={2} />
    </button>
  );
}
