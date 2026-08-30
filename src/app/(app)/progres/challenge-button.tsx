"use client";

import { LogOut, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

import { joinChallenge, leaveChallenge } from "./actions";

const t = fr.progres.challenges;

export function ChallengeButton({
  slug,
  joined,
}: {
  slug: string;
  joined: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      if (joined) {
        await leaveChallenge(slug);
      } else {
        const result = await joinChallenge(slug);
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
      variant={joined ? "ghost" : "secondary"}
      onClick={toggle}
      disabled={pending}
    >
      {joined ? <LogOut /> : <Rocket />}
      {joined ? t.leave : t.join}
    </Button>
  );
}
