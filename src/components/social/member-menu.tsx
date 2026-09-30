"use client";

import { MoreHorizontal, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { blockUser, unblockUser } from "@/app/(app)/communaute/actions";
import { fr } from "@/i18n/fr";

const t = fr.communaute.member;

/** « Bloquer » on someone's profile (reporting stays on their posts). */
export function MemberMenu({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function onBlock() {
    setOpen(false);
    if (!window.confirm(t.blockConfirm)) return;
    await blockUser(userId);
    toast(t.blocked);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t.menu}
        aria-expanded={open}
        className="rounded-full border bg-card p-2 text-ink-70 hover:bg-ink-10"
      >
        <MoreHorizontal size={16} strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-20 flex w-48 flex-col rounded-lg border bg-card py-1 text-sm shadow-pop">
          <button
            type="button"
            onClick={onBlock}
            className="flex items-center gap-2 px-3 py-1.5 text-left text-warn hover:bg-ink-10"
          >
            <UserX size={14} strokeWidth={2} aria-hidden />
            {t.block}
          </button>
        </div>
      )}
    </div>
  );
}

export function UnblockButton({ userId }: { userId: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await unblockUser(userId);
        toast(t.unblocked);
        router.refresh();
      }}
      className="font-semibold underline underline-offset-2"
    >
      {t.unblock}
    </button>
  );
}
