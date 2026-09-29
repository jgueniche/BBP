import { BadgeCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { fr } from "@/i18n/fr";
import { claimMethod } from "@/lib/creators/claim";
import {
  creatorLabel,
  creatorPath,
  isCreatorPlatform,
} from "@/lib/creators/identity";
import { loadCreatorsByIds } from "@/lib/creators/server";
import { loadMembers } from "@/lib/social/members";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { ClaimDecision, RemovalActions } from "./queue-actions";

const t = fr.creators.admin;

const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Paris",
});

export default async function CreatorsAdminPage() {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    return (
      <section>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t.title}
        </h1>
        <p className="mt-3 text-sm text-ink-70">
          {fr.communaute.admin.notAdmin}
        </p>
      </section>
    );
  }

  const [{ data: claims }, { data: requests }] = await Promise.all([
    supabase
      .from("creator_claims")
      .select("id, creator_id, user_id, code, created_at")
      .eq("status", "pending")
      .order("created_at")
      .limit(50),
    supabase.rpc("creator_removal_requests"),
  ]);
  const [creators, requesters] = await Promise.all([
    loadCreatorsByIds(
      supabase,
      (claims ?? []).map((claim) => claim.creator_id),
    ),
    loadMembers(
      supabase,
      (claims ?? []).map((claim) => claim.user_id),
    ),
  ]);

  return (
    <section className="flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/moderation"
          className="text-xs font-semibold text-ink-70 underline underline-offset-2"
        >
          {t.back}
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
          <BadgeCheck size={26} strokeWidth={2} aria-hidden />
          {t.title}
        </h1>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold">{t.claimsTitle}</h2>
        {(claims ?? []).length === 0 ? (
          <p className="text-sm text-ink-50">{t.claimsEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(claims ?? []).map((claim) => {
              const creator = creators.get(claim.creator_id);
              if (!creator) return null;
              const requester = requesters.get(claim.user_id);
              return (
                <li
                  key={claim.id}
                  className="flex flex-col gap-2 rounded-lg border bg-card p-3"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={creatorPath(creator.platform, creator.handle)}
                      className="font-semibold underline-offset-2 hover:underline"
                    >
                      {creator.label}
                    </Link>
                    <span className="text-xs text-ink-50">
                      {fr.creators.platforms[creator.platform]} ·{" "}
                      {t.method[claimMethod(creator.platform)]} ·{" "}
                      {dayFormat.format(new Date(claim.created_at))}
                    </span>
                  </div>
                  <p className="text-xs text-ink-70">
                    {t.requester}{" "}
                    <span className="font-semibold">
                      {requester?.name ?? fr.recettes.authorHidden}
                    </span>
                  </p>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-ink-70">
                    {t.code}
                    <code className="rounded-[10px] bg-ink-10 px-2 py-0.5 font-mono text-sm font-semibold text-ink select-all">
                      {claim.code}
                    </code>
                    <a
                      href={creator.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 font-semibold underline underline-offset-2"
                    >
                      {t.openAccount}
                      <ExternalLink size={11} strokeWidth={2} aria-hidden />
                    </a>
                  </p>
                  <ClaimDecision claimId={claim.id} />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold">{t.reportsTitle}</h2>
        {(requests ?? []).length === 0 ? (
          <p className="text-sm text-ink-50">{t.reportsEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(requests ?? []).map((request) => {
              const platform =
                request.creator_platform &&
                isCreatorPlatform(request.creator_platform)
                  ? request.creator_platform
                  : null;
              const label =
                platform && request.creator_handle
                  ? creatorLabel(platform, request.creator_handle)
                  : null;
              return (
                <li
                  key={request.report_id}
                  className="flex flex-col gap-2 rounded-lg border bg-card p-3"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    {label && platform && request.creator_handle ? (
                      <Link
                        href={creatorPath(platform, request.creator_handle)}
                        className="font-semibold underline-offset-2 hover:underline"
                      >
                        {label}
                      </Link>
                    ) : null}
                    <span className="text-xs text-ink-50">
                      {request.target_kind === "creator"
                        ? t.profileRequest
                        : request.recipe_title}{" "}
                      · {dayFormat.format(new Date(request.created_at))}
                    </span>
                  </div>
                  <p className="rounded-[10px] bg-ink-10 px-3 py-2 text-sm">
                    {request.reason}
                  </p>
                  {request.source_url && (
                    <a
                      href={request.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-fit items-center gap-0.5 text-xs font-semibold underline underline-offset-2"
                    >
                      {fr.creators.credit.viewOriginal}
                      <ExternalLink size={11} strokeWidth={2} aria-hidden />
                    </a>
                  )}
                  {request.post_withdrawn && (
                    <p className="text-xs text-ink-70">{t.postWithdrawn}</p>
                  )}
                  <RemovalActions
                    reportId={request.report_id}
                    creatorId={request.creator_id}
                    sourceKey={
                      request.target_kind === "recipe"
                        ? request.source_key
                        : null
                    }
                    withdrawn={request.post_withdrawn}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
