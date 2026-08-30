"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  acceptTdeeProposal,
  dismissTdeeProposal,
} from "@/app/(app)/poids/actions";
import { CoachBubble } from "@/components/coach/coach-bubble";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

const t = fr.poids;

export type ProposalView = {
  id: string;
  new_tdee: number;
  new_calorie_target: number | null;
  avg_intake_kcal: number;
  trend_change_kg: number;
  days_with_logs: number;
};

function fillTemplate(template: string, proposal: ProposalView): string {
  const delta = proposal.trend_change_kg;
  return template
    .replace("{days}", `${proposal.days_with_logs}`)
    .replace("{intake}", `${proposal.avg_intake_kcal}`)
    .replace(
      "{delta}",
      `${delta > 0 ? "+" : ""}${delta.toLocaleString("fr-FR")}`,
    )
    .replace("{tdee}", `${proposal.new_tdee}`)
    .replace("{target}", `${proposal.new_calorie_target ?? ""}`);
}

export function ProposalCard({ proposal }: { proposal: ProposalView }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const message = fillTemplate(
    proposal.new_calorie_target !== null
      ? t.proposalKemia
      : t.proposalKemiaNoTarget,
    proposal,
  );

  async function onAccept() {
    setPending(true);
    try {
      await acceptTdeeProposal(proposal.id);
      toast(t.proposalAccepted);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onDismiss() {
    setPending(true);
    try {
      await dismissTdeeProposal(proposal.id);
      toast(t.proposalDismissed);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-soft">
      <h2 className="font-display text-lg font-extrabold">{t.proposalTitle}</h2>
      <CoachBubble expression="clin">{message}</CoachBubble>
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          disabled={pending}
        >
          {t.proposalDismiss}
        </Button>
        <Button size="sm" onClick={onAccept} disabled={pending}>
          {t.proposalAccept}
        </Button>
      </div>
    </section>
  );
}
