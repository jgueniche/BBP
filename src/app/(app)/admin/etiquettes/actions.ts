"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { normalizeTag } from "@/lib/social/tags";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) throw new Error("Not an admin");
  return supabase;
}

const reviewSchema = z.object({
  tagId: z.uuid(),
  synonymOf: z.string().max(40),
  parent: z.string().max(40),
});

/**
 * Review a member tag: optionally attach it as a synonym of a reference tag
 * and/or place it under a category. RLS allows these updates to admins only.
 */
export async function reviewTag(raw: z.input<typeof reviewSchema>) {
  const input = reviewSchema.parse(raw);
  const supabase = await requireAdmin();

  async function referenceId(value: string): Promise<string | null | false> {
    const tag = normalizeTag(value);
    if (!tag) return null;
    const { data } = await supabase
      .from("tags")
      .select("id, canonical_id")
      .eq("slug", tag.slug)
      .maybeSingle();
    if (!data || data.id === input.tagId) return false;
    return data.canonical_id ?? data.id;
  }

  const canonicalId = await referenceId(input.synonymOf);
  const parentId = await referenceId(input.parent);
  if (canonicalId === false || parentId === false) {
    return { ok: false as const, code: "unknown" as const };
  }
  const { error } = await supabase
    .from("tags")
    .update({ canonical_id: canonicalId, parent_id: parentId, reviewed: true })
    .eq("id", input.tagId);
  if (error) return { ok: false as const, code: "error" as const };
  revalidatePath("/admin/etiquettes");
  return { ok: true as const };
}

export async function deleteTag(tagId: string) {
  const id = z.uuid().parse(tagId);
  const supabase = await requireAdmin();
  await supabase.from("tags").delete().eq("id", id);
  revalidatePath("/admin/etiquettes");
  return { ok: true as const };
}
