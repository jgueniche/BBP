"use client";

import { BadgeCheck, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  cancelClaim,
  startClaim,
  verifySiteClaim,
} from "@/app/(app)/createrices/actions";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import { claimMethod } from "@/lib/creators/claim";
import type { CreatorPlatform } from "@/lib/creators/identity";

const p = fr.creators.page;
const c = fr.creators.claim;

export type ClaimState =
  | { kind: "none" }
  | { kind: "pending"; claimId: string; code: string }
  | { kind: "rejected"; reason: string | null };

/** « C'est moi »: the code to show on her account, then the check. */
export function ClaimPanel({
  creatorId,
  platform,
  initial,
}: {
  creatorId: string;
  platform: CreatorPlatform;
  initial: ClaimState;
}) {
  const router = useRouter();
  const [state, setState] = useState<ClaimState>(initial);
  const [pending, setPending] = useState(false);
  const method = claimMethod(platform);

  async function start() {
    setPending(true);
    try {
      const result = await startClaim(creatorId);
      if (result.ok) {
        setState({
          kind: "pending",
          claimId: result.claimId,
          code: result.code,
        });
        return;
      }
      if (result.code === "mine") {
        router.refresh();
        return;
      }
      toast(result.code === "claimed" ? c.alreadyClaimed : c.error);
    } catch {
      toast(c.error);
    } finally {
      setPending(false);
    }
  }

  async function verify(claimId: string) {
    setPending(true);
    try {
      const result = await verifySiteClaim(claimId);
      if (result.ok) {
        toast(result.status === "approved" ? c.verified : c.manual);
        if (result.status === "approved") router.refresh();
        return;
      }
      toast(
        result.code === "missing"
          ? c.codeMissing
          : result.code === "unreachable"
            ? c.siteUnreachable
            : c.error,
      );
    } catch {
      toast(c.error);
    } finally {
      setPending(false);
    }
  }

  async function cancel(claimId: string) {
    setPending(true);
    try {
      const result = await cancelClaim(claimId);
      if (result.ok) {
        setState({ kind: "none" });
        toast(c.cancelled);
      }
    } finally {
      setPending(false);
    }
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast(c.copied);
    } catch {
      // The code stays visible and selectable.
    }
  }

  return (
    <section
      id="revendiquer"
      aria-labelledby="claim-title"
      className="flex scroll-mt-6 flex-col gap-3 rounded-lg bg-beurre p-4"
    >
      <h2 id="claim-title" className="font-display text-lg font-semibold">
        {p.claimTitle}
      </h2>
      {state.kind === "pending" ? (
        <>
          <p className="text-sm text-ink-70">
            {method === "site"
              ? c.siteSteps
              : c.bioSteps.replace(
                  "{platform}",
                  fr.creators.platforms[platform],
                )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-ink-70">{c.code}</span>
            <code className="rounded-[10px] bg-card px-2.5 py-1 font-mono text-sm font-semibold select-all">
              {state.code}
            </code>
            <Button size="sm" variant="ghost" onClick={() => copy(state.code)}>
              <Copy />
              {c.copy}
            </Button>
          </div>
          {method === "site" && (
            <p className="font-mono text-[11px] break-all text-ink-70">
              {c.metaExample.replace("{code}", state.code)}
            </p>
          )}
          <p className="text-xs text-ink-70">{c.pending}</p>
          <div className="flex flex-wrap gap-2">
            {method === "site" && (
              <Button
                size="sm"
                onClick={() => verify(state.claimId)}
                disabled={pending}
              >
                <BadgeCheck />
                {c.verify}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => cancel(state.claimId)}
              disabled={pending}
            >
              {c.cancel}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-70">{p.claimIntro}</p>
          {state.kind === "rejected" && (
            <p className="text-xs text-ink-70">
              {c.rejected}
              {state.reason && ` ${c.reason.replace("{reason}", state.reason)}`}
            </p>
          )}
          <div>
            <Button size="sm" onClick={start} disabled={pending}>
              <BadgeCheck />
              {p.claimCta}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
