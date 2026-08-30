"use client";

import { LogOut, Pencil, Share2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  deleteCollection,
  leaveCollection,
} from "@/app/(app)/recettes/collection-actions";
import { CollectionDialog } from "@/components/recipes/collection-dialog";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

const t = fr.recettes.collections;

export function CollectionActionsBar({
  collection,
  isOwner,
}: {
  collection: {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string | null;
    share_token: string;
  };
  isOwner: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onShare() {
    const url = `${window.location.origin}/recettes/carnets/rejoindre/${collection.share_token}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: collection.name, url });
        return;
      }
    } catch {
      // Fall through to clipboard when the share sheet is dismissed.
    }
    await navigator.clipboard.writeText(url);
    toast(t.shareCopied);
  }

  async function onDelete() {
    if (!window.confirm(t.deleteConfirm)) return;
    setBusy(true);
    try {
      await deleteCollection(collection.id);
      router.push("/recettes?tab=carnets");
    } finally {
      setBusy(false);
    }
  }

  async function onLeave() {
    setBusy(true);
    try {
      await leaveCollection(collection.id);
      router.push("/recettes?tab=carnets");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={onShare} disabled={busy}>
        <Share2 />
        {t.share}
      </Button>
      {isOwner ? (
        <>
          <CollectionDialog
            initial={collection}
            trigger={
              <Button variant="outline" size="sm" disabled={busy}>
                <Pencil />
                {fr.recettes.edit}
              </Button>
            }
          />
          <Button variant="ghost" size="sm" onClick={onDelete} disabled={busy}>
            <Trash2 />
            {t.delete}
          </Button>
        </>
      ) : (
        <Button variant="ghost" size="sm" onClick={onLeave} disabled={busy}>
          <LogOut />
          {t.leave}
        </Button>
      )}
    </div>
  );
}
