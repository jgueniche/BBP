"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) throw new Error("Not an admin");
  return { supabase };
}

function revalidateQueue() {
  revalidatePath("/admin/createrices");
  revalidatePath("/createrices", "layout");
}

const decisionSchema = z.object({
  claimId: z.uuid(),
  approve: z.boolean(),
  reason: z.string().trim().max(300).nullable(),
});

/** Validate a claim, or refuse it with a reason shown to the requester. */
export async function decideClaim(raw: z.input<typeof decisionSchema>) {
  const input = decisionSchema.parse(raw);
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("decide_creator_claim", {
    claim: input.claimId,
    approve: input.approve,
    why: input.reason && input.reason.length > 0 ? input.reason : null,
  });
  revalidateQueue();
  return { ok: !error && data === true };
}

async function closeReport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reportId: string,
  status: "resolved" | "dismissed",
) {
  const { error } = await supabase
    .from("reports")
    .update({ status })
    .eq("id", reportId);
  return !error;
}

const withdrawSchema = z.object({
  reportId: z.uuid(),
  creatorId: z.uuid().nullable(),
  key: z.string().min(3).max(600),
});

/** A removal request about a post: every copy goes private and marked. */
export async function withdrawRequestedPost(
  raw: z.input<typeof withdrawSchema>,
) {
  const input = withdrawSchema.parse(raw);
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("withdraw_creator_post", {
    cid: input.creatorId,
    key: input.key,
  });
  const ok = typeof data === "number" && data >= 0;
  if (ok) await closeReport(supabase, input.reportId, "resolved");
  revalidateQueue();
  return { ok };
}

/** A removal request about a whole profile: future imports refused. */
export async function blockRequestedCreator(raw: {
  reportId: string;
  creatorId: string;
}) {
  const reportId = z.uuid().parse(raw.reportId);
  const creatorId = z.uuid().parse(raw.creatorId);
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("set_creator_imports_blocked", {
    cid: creatorId,
    blocked: true,
  });
  const ok = data === true;
  if (ok) await closeReport(supabase, reportId, "resolved");
  revalidateQueue();
  return { ok };
}

export async function closeRemovalRequest(raw: {
  reportId: string;
  status: "resolved" | "dismissed";
}) {
  const reportId = z.uuid().parse(raw.reportId);
  const status = z.enum(["resolved", "dismissed"]).parse(raw.status);
  const { supabase } = await requireAdmin();
  const ok = await closeReport(supabase, reportId, status);
  revalidateQueue();
  return { ok };
}
