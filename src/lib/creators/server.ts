import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/db/types";

import {
  creatorLabel,
  isCreatorPlatform,
  type CreatorIdentity,
  type CreatorPlatform,
} from "./identity";

type Supabase = SupabaseClient<Database>;

export type CreatorRow = {
  id: string;
  platform: CreatorPlatform;
  handle: string;
  label: string;
  displayName: string | null;
  profileUrl: string;
  claimedBy: string | null;
  importsBlocked: boolean;
};

const SELECT =
  "id, platform, handle, display_name, profile_url, claimed_by, imports_blocked";

function toRow(row: {
  id: string;
  platform: string;
  handle: string;
  display_name: string | null;
  profile_url: string;
  claimed_by: string | null;
  imports_blocked: boolean;
}): CreatorRow | null {
  if (!isCreatorPlatform(row.platform)) return null;
  return {
    id: row.id,
    platform: row.platform,
    handle: row.handle,
    label: creatorLabel(row.platform, row.handle),
    displayName: row.display_name,
    profileUrl: row.profile_url,
    claimedBy: row.claimed_by,
    importsBlocked: row.imports_blocked,
  };
}

export async function loadCreatorsByIds(
  supabase: Supabase,
  ids: string[],
): Promise<Map<string, CreatorRow>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data } = await supabase
    .from("creators")
    .select(SELECT)
    .in("id", unique);
  return new Map(
    (data ?? [])
      .map(toRow)
      .filter((row): row is CreatorRow => row !== null)
      .map((row) => [row.id, row]),
  );
}

export async function loadCreatorByPath(
  supabase: Supabase,
  platform: string,
  handle: string,
): Promise<CreatorRow | null> {
  if (!isCreatorPlatform(platform)) return null;
  const { data } = await supabase
    .from("creators")
    .select(SELECT)
    .eq("platform", platform)
    .eq("handle", handle.toLowerCase())
    .maybeSingle();
  return data ? toRow(data) : null;
}

/** Creator profiles claimed by these members (for the verified badge). */
export async function loadClaimedCreators(
  supabase: Supabase,
  memberIds: string[],
): Promise<Map<string, CreatorRow[]>> {
  const unique = [...new Set(memberIds)];
  if (unique.length === 0) return new Map();
  const { data } = await supabase
    .from("creators")
    .select(SELECT)
    .in("claimed_by", unique);
  const byMember = new Map<string, CreatorRow[]>();
  for (const raw of data ?? []) {
    const row = toRow(raw);
    if (!row?.claimedBy) continue;
    byMember.set(row.claimedBy, [...(byMember.get(row.claimedBy) ?? []), row]);
  }
  return byMember;
}

export async function resolveCreatorId(
  supabase: Supabase,
  identity: CreatorIdentity,
  displayName: string | null,
): Promise<string | null> {
  const { data } = await supabase.rpc("resolve_creator", {
    p_platform: identity.platform,
    p_handle: identity.handle,
    p_display_name: displayName,
    p_profile_url: identity.profileUrl,
  });
  return typeof data === "string" ? data : null;
}

export type ImportCheck = {
  withdrawn: boolean;
  blocked: boolean;
  official: { slug: string; title: string } | null;
};

const NO_GATE: ImportCheck = {
  withdrawn: false,
  blocked: false,
  official: null,
};

const importStatusSchema = z
  .object({
    withdrawn: z.boolean().catch(false),
    blocked: z.boolean().catch(false),
    official: z
      .object({ slug: z.string().min(1), title: z.string() })
      .nullable()
      .catch(null),
  })
  .catch(NO_GATE);

/**
 * Before an import: withdrawn post, refused imports, official version. An
 * unreadable answer lets the import through (the credit is kept anyway).
 */
export async function checkImport(
  supabase: Supabase,
  url: string,
  identity: CreatorIdentity | null,
): Promise<ImportCheck> {
  const { data } = await supabase.rpc("import_status", {
    url,
    p_platform: identity?.platform ?? null,
    p_handle: identity?.handle ?? null,
  });
  return importStatusSchema.parse(data ?? NO_GATE);
}

export type CreatorTotals = { posts: number; saved: number; cooked: number };

const totalsSchema = z
  .object({
    posts: z.number().catch(0),
    saved: z.number().catch(0),
    cooked: z.number().catch(0),
  })
  .catch({ posts: 0, saved: 0, cooked: 0 });

export async function loadCreatorTotals(
  supabase: Supabase,
  creatorId: string,
): Promise<CreatorTotals> {
  const { data } = await supabase.rpc("creator_public_stats", {
    cid: creatorId,
  });
  return totalsSchema.parse(data ?? {});
}

export type CreatorPostStat = {
  key: string;
  url: string;
  title: string;
  imports: number;
  saves: number;
  cooks: number;
  clicks: number;
  withdrawn: boolean;
};

/** Per post, for the creator herself (empty for anyone else). */
export async function loadCreatorPostStats(
  supabase: Supabase,
  creatorId: string,
): Promise<CreatorPostStat[]> {
  const { data } = await supabase.rpc("creator_post_stats", {
    cid: creatorId,
  });
  return (data ?? []).map((row) => ({
    key: row.source_key,
    url: row.source_url,
    title: row.title,
    imports: Number(row.imports),
    saves: Number(row.saves),
    cooks: Number(row.cooks),
    clicks: Number(row.clicks),
    withdrawn: row.withdrawn,
  }));
}
