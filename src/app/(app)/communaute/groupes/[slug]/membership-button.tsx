"use client";

import { LogOut, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { joinGroup, leaveGroup } from "@/app/(app)/communaute/actions";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

const t = fr.communaute.groups;

export function MembershipButton({
  groupId,
  isMember,
}: {
  groupId: string;
  isMember: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      if (isMember) {
        await leaveGroup(groupId);
      } else {
        const result = await joinGroup(groupId);
        if (result.ok) toast(t.joined);
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      size="sm"
      variant={isMember ? "ghost" : "default"}
      onClick={toggle}
      disabled={pending}
    >
      {isMember ? <LogOut /> : <UserPlus />}
      {isMember ? t.leave : t.join}
    </Button>
  );
}
