"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function moderateContent(params: {
  targetKind: "post" | "comment";
  targetId: string;
  status: "ok" | "blocked";
  reportId?: string | null;
}) {
  const targetId = z.uuid().parse(params.targetId);
  const { supabase } = await requireUser();

  const { data: done } = await supabase.rpc("admin_set_moderation", {
    target_kind: params.targetKind === "comment" ? "comment" : "post",
    target_id: targetId,
    new_status: params.status === "blocked" ? "blocked" : "ok",
  });
  if (params.reportId) {
    await supabase
      .from("reports")
      .update({
        status: params.status === "blocked" ? "resolved" : "dismissed",
      })
      .eq("id", z.uuid().parse(params.reportId));
  }
  revalidatePath("/admin/moderation");
  return { ok: done === true };
}

export async function dismissReport(reportId: string) {
  const id = z.uuid().parse(reportId);
  const { supabase } = await requireUser();
  await supabase.from("reports").update({ status: "dismissed" }).eq("id", id);
  revalidatePath("/admin/moderation");
  return { ok: true as const };
}
