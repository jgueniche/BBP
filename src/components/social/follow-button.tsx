"use client";

import { UserMinus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { toggleFollow } from "@/app/(app)/communaute/actions";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

const t = fr.communaute.member;

export function FollowButton({
  userId,
  initialFollowing,
  label,
  size = "sm",
}: {
  userId: string;
  initialFollowing: boolean;
  /** Replaces « Suivre » (e.g. « Suivre aussi » in my followers list). */
  label?: string;
  size?: "sm" | "xs";
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      const result = await toggleFollow(userId);
      if (!result.ok) {
        toast(t.followFailed);
        return;
      }
      setFollowing(result.following);
      if (result.following) toast(fr.communaute.post.followed);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      size={size}
      variant={following ? "secondary" : "default"}
      onClick={onClick}
      disabled={pending}
      aria-pressed={following}
    >
      {following ? <UserMinus /> : <UserPlus />}
      {following ? t.unfollow : (label ?? t.follow)}
    </Button>
  );
}
