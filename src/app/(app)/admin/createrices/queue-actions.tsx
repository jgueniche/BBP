"use client";

import { Ban, Check, EyeOff, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

import {
  blockRequestedCreator,
  closeRemovalRequest,
  decideClaim,
  withdrawRequestedPost,
} from "./actions";

const t = fr.creators.admin;

function useRun() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function run(action: () => Promise<{ ok: boolean }>) {
    setPending(true);
    try {
      const result = await action();
      toast(result.ok ? t.done : fr.creators.claim.error);
      if (result.ok) router.refresh();
    } catch {
      toast(fr.creators.claim.error);
    } finally {
      setPending(false);
    }
  }
  return { pending, run };
}

export function ClaimDecision({ claimId }: { claimId: string }) {
  const { pending, run } = useRun();
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          run(() => decideClaim({ claimId, approve: true, reason: null }))
        }
      >
        <Check />
        {t.approve}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          const reason = window.prompt(t.rejectPrompt);
          if (reason === null) return;
          void run(() => decideClaim({ claimId, approve: false, reason }));
        }}
      >
        <X />
        {t.reject}
      </Button>
    </div>
  );
}

export function RemovalActions({
  reportId,
  creatorId,
  sourceKey,
  withdrawn,
}: {
  reportId: string;
  creatorId: string | null;
  /** The post behind a reported copy; null for a whole profile. */
  sourceKey: string | null;
  withdrawn: boolean;
}) {
  const { pending, run } = useRun();
  return (
    <div className="flex flex-wrap gap-1.5">
      {sourceKey && !withdrawn && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() =>
              withdrawRequestedPost({ reportId, creatorId, key: sourceKey }),
            )
          }
        >
          <EyeOff />
          {t.withdrawPost}
        </Button>
      )}
      {!sourceKey && creatorId && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => blockRequestedCreator({ reportId, creatorId }))
          }
        >
          <Ban />
          {t.blockImports}
        </Button>
      )}
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          run(() => closeRemovalRequest({ reportId, status: "resolved" }))
        }
      >
        <Check />
        {t.resolved}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          run(() => closeRemovalRequest({ reportId, status: "dismissed" }))
        }
      >
        {t.dismiss}
      </Button>
    </div>
  );
}
