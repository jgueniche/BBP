"use client";

import { UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { removeFollower } from "@/app/(app)/communaute/actions";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

const t = fr.communaute.network;

export function RemoveFollowerButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      size="xs"
      variant="ghost"
      disabled={pending}
      onClick={async () => {
        if (!window.confirm(t.removeConfirm)) return;
        setPending(true);
        const result = await removeFollower(userId);
        setPending(false);
        if (result.ok) {
          toast(t.removed);
          router.refresh();
        }
      }}
    >
      <UserX />
      {t.remove}
    </Button>
  );
}
