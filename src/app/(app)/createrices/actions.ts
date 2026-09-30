"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  claimMethod,
  generateClaimCode,
  pageHasClaimCode,
  siteHomeUrl,
} from "@/lib/creators/claim";
import {
  CREATOR_PLATFORMS,
  creatorPath,
  isCreatorPlatform,
  normalizeCreatorHandle,
  profileUrlFor,
} from "@/lib/creators/identity";
import { loadCreatorLinks, resolveCreatorId } from "@/lib/creators/server";
import { fetchHtml } from "@/lib/import/fetch";
import { isOnSite } from "@/lib/import/net/address";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function loadCreator(supabase: Supabase, creatorId: string) {
  const { data } = await supabase
    .from("creators")
    .select("id, platform, handle, verified")
    .eq("id", creatorId)
    .maybeSingle();
  return data && isCreatorPlatform(data.platform)
    ? { ...data, platform: data.platform }
    : null;
}

function revalidateCreator(platform: string, handle: string) {
  if (isCreatorPlatform(platform)) {
    revalidatePath(creatorPath(platform, handle));
  }
}

export type ClaimResult =
  | { ok: true; claimId: string; code: string; method: "site" | "bio" }
  | { ok: false; code: "claimed" | "mine" | "error" };

async function openClaim(
  supabase: Supabase,
  userId: string,
  creatorId: string,
): Promise<ClaimResult> {
  const creator = await loadCreator(supabase, creatorId);
  if (!creator) return { ok: false, code: "error" };
  if (creator.verified) {
    const links = await loadCreatorLinks(supabase, { creatorIds: [creatorId] });
    return {
      ok: false,
      code: links.memberOf.get(creatorId) === userId ? "mine" : "claimed",
    };
  }
  const method = claimMethod(creator.platform);

  // One pending claim per person and profile: the same code until decided.
  const { data: pending } = await supabase
    .from("creator_claims")
    .select("id, code")
    .eq("creator_id", creatorId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  if (pending) {
    return { ok: true, claimId: pending.id, code: pending.code, method };
  }
  const { data: created, error } = await supabase
    .from("creator_claims")
    .insert({
      creator_id: creatorId,
      user_id: userId,
      code: generateClaimCode(),
    })
    .select("id, code")
    .single();
  if (error) return { ok: false, code: "error" };
  revalidateCreator(creator.platform, creator.handle);
  return { ok: true, claimId: created.id, code: created.code, method };
}

/** « C'est moi »: a pending claim and the code to show on her account. */
export async function startClaim(creatorId: string): Promise<ClaimResult> {
  const id = z.uuid().parse(creatorId);
  const { supabase, user } = await requireUser();
  return openClaim(supabase, user.id, id);
}

export async function cancelClaim(claimId: string) {
  const id = z.uuid().parse(claimId);
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("creator_claims")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .select("creator_id")
    .maybeSingle();
  if (data) {
    const creator = await loadCreator(supabase, data.creator_id);
    if (creator) revalidateCreator(creator.platform, creator.handle);
  }
  return { ok: data !== null };
}

export type SiteCheckResult =
  | { ok: true; status: "approved" | "manual" }
  | { ok: false; code: "missing" | "unreachable" | "error" };

/**
 * A site proves itself: the code on its home page. The platform approves
 * it right away; without a service key, the team does.
 */
export async function verifySiteClaim(
  claimId: string,
): Promise<SiteCheckResult> {
  const id = z.uuid().parse(claimId);
  const { supabase, user } = await requireUser();
  const { data: claim } = await supabase
    .from("creator_claims")
    .select("id, code, creator_id, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!claim || claim.status !== "pending") return { ok: false, code: "error" };
  const creator = await loadCreator(supabase, claim.creator_id);
  if (!creator || creator.platform !== "web" || creator.verified) {
    return { ok: false, code: "error" };
  }

  // Only her own site counts: a redirect to another domain is not followed.
  const html = await fetchHtml(siteHomeUrl(creator.handle), {
    allowHost: (host) => isOnSite(host, creator.handle),
  });
  if (!html) return { ok: false, code: "unreachable" };
  if (!pageHasClaimCode(html, claim.code))
    return { ok: false, code: "missing" };

  const admin = createAdminClient();
  if (!admin) return { ok: true, status: "manual" };
  const { data: approved } = await admin.rpc("approve_site_claim", {
    claim: claim.id,
  });
  revalidateCreator(creator.platform, creator.handle);
  revalidatePath("/profil");
  return approved === true
    ? { ok: true, status: "approved" }
    : { ok: false, code: "error" };
}

const joinSchema = z.object({
  platform: z.enum(CREATOR_PLATFORMS),
  handle: z.string().trim().min(1).max(120),
});

export type JoinResult =
  | { ok: true; path: string; claim: ClaimResult }
  | { ok: false; code: "invalid" | "error" };

/** « Je suis créatrice »: finds (or adds) her profile and opens a claim. */
export async function joinAsCreator(
  raw: z.input<typeof joinSchema>,
): Promise<JoinResult> {
  const input = joinSchema.parse(raw);
  const { supabase, user } = await requireUser();
  const handle = normalizeCreatorHandle(input.platform, input.handle);
  if (!handle) return { ok: false, code: "invalid" };
  const creatorId = await resolveCreatorId(supabase, {
    platform: input.platform,
    handle,
    profileUrl: profileUrlFor(input.platform, handle),
  });
  if (!creatorId) return { ok: false, code: "error" };
  const claim = await openClaim(supabase, user.id, creatorId);
  return { ok: true, path: creatorPath(input.platform, handle), claim };
}

// ---------------------------------------------------------------------------
// Her space (the verified creator, or the team): posts and imports.
// ---------------------------------------------------------------------------

const postSchema = z.object({
  creatorId: z.uuid(),
  key: z.string().min(3).max(600),
});

export async function withdrawPost(raw: z.input<typeof postSchema>) {
  const input = postSchema.parse(raw);
  const { supabase } = await requireUser();
  const { data } = await supabase.rpc("withdraw_creator_post", {
    cid: input.creatorId,
    key: input.key,
  });
  const creator = await loadCreator(supabase, input.creatorId);
  if (creator) revalidateCreator(creator.platform, creator.handle);
  return { ok: typeof data === "number" && data >= 0 };
}

export async function restorePost(raw: z.input<typeof postSchema>) {
  const input = postSchema.parse(raw);
  const { supabase } = await requireUser();
  const { data } = await supabase.rpc("restore_creator_post", {
    cid: input.creatorId,
    key: input.key,
  });
  const creator = await loadCreator(supabase, input.creatorId);
  if (creator) revalidateCreator(creator.platform, creator.handle);
  return { ok: data === true };
}

export async function setImportsBlocked(creatorId: string, blocked: boolean) {
  const id = z.uuid().parse(creatorId);
  const { supabase } = await requireUser();
  const { data } = await supabase.rpc("set_creator_imports_blocked", {
    cid: id,
    blocked: z.boolean().parse(blocked),
  });
  const creator = await loadCreator(supabase, id);
  if (creator) revalidateCreator(creator.platform, creator.handle);
  return { ok: data === true };
}
