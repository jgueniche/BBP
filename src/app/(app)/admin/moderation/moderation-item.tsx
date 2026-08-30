"use client";

import { Check, EyeOff, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

import { dismissReport, moderateContent } from "./actions";

const t = fr.communaute.admin;

export function ModerationActions({
  targetKind,
  targetId,
  reportId,
  isBlocked,
}: {
  targetKind: "post" | "comment";
  targetId: string | null;
  reportId?: string | null;
  isBlocked: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run(status: "ok" | "blocked") {
    if (!targetId) return;
    setPending(true);
    try {
      await moderateContent({ targetKind, targetId, status, reportId });
      toast(t.done);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function dismiss() {
    if (!reportId) return;
    setPending(true);
    try {
      await dismissReport(reportId);
      toast(t.done);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {targetId && !isBlocked && (
        <Button size="sm" onClick={() => run("blocked")} disabled={pending}>
          <EyeOff />
          {t.remove}
        </Button>
      )}
      {targetId && isBlocked && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => run("ok")}
          disabled={pending}
        >
          <RotateCcw />
          {t.restore}
        </Button>
      )}
      {reportId && (
        <Button size="sm" variant="ghost" onClick={dismiss} disabled={pending}>
          <Check />
          {t.dismiss}
        </Button>
      )}
    </div>
  );
}
