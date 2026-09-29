"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteCookLog } from "@/app/(app)/recettes/journal-actions";
import { fr } from "@/i18n/fr";

const t = fr.recettes.journal;

export function DeleteEntryButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={t.delete}
      title={t.delete}
      onClick={async () => {
        if (!window.confirm(t.deleteConfirm)) return;
        const result = await deleteCookLog(entryId);
        if (result.ok) {
          toast(t.deleted);
          router.refresh();
        }
      }}
      className="rounded-full p-1.5 text-ink-30 hover:bg-ink-10 hover:text-ink-70"
    >
      <Trash2 size={14} strokeWidth={2} />
    </button>
  );
}
