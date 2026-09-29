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
  /** Claimed and checked by the team (who claimed it stays private). */
  verified: boolean;
  importsBlocked: boolean;
};

const SELECT =
  "id, platform, handle, display_name, profile_url, verified, imports_blocked";

function toRow(row: {
  id: string;
  platform: string;
  handle: string;
  display_name: string | null;
  profile_url: string;
  verified: boolean;
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
    verified: row.verified,
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

export type CreatorLinks = {
  /** Creator id → the member who claimed it. */
  memberOf: Map<string, string>;
  /** Member id → the creator profiles she claimed. */
  creatorsOf: Map<string, string[]>;
};

/**
 * Verified profiles and the members behind them, only where the member's
 * own profile is public (or for herself and the team).
 */
export async function loadCreatorLinks(
  supabase: Supabase,
  query: { creatorIds?: string[]; memberIds?: string[] },
): Promise<CreatorLinks> {
  const creatorIds = [...new Set(query.creatorIds ?? [])];
  const memberIds = [...new Set(query.memberIds ?? [])];
  const links: CreatorLinks = { memberOf: new Map(), creatorsOf: new Map() };
  if (creatorIds.length === 0 && memberIds.length === 0) return links;
  const { data } = await supabase.rpc("creator_links", {
    p_creators: creatorIds,
    p_members: memberIds,
  });
  for (const row of data ?? []) {
    links.memberOf.set(row.creator_id, row.member_id);
    links.creatorsOf.set(row.member_id, [
      ...(links.creatorsOf.get(row.member_id) ?? []),
      row.creator_id,
    ]);
  }
  return links;
}

/** The verified creator profiles of these members, for the badge. */
export async function loadClaimedCreators(
  supabase: Supabase,
  memberIds: string[],
): Promise<Map<string, CreatorRow[]>> {
  const links = await loadCreatorLinks(supabase, { memberIds });
  const creators = await loadCreatorsByIds(supabase, [
    ...links.memberOf.keys(),
  ]);
  const byMember = new Map<string, CreatorRow[]>();
  for (const [memberId, ids] of links.creatorsOf) {
    const rows = ids
      .map((id) => creators.get(id))
      .filter((row): row is CreatorRow => row !== undefined);
    if (rows.length > 0) byMember.set(memberId, rows);
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
  /** The verified creator importing her own post: always allowed. */
  mine: boolean;
};

const NO_GATE: ImportCheck = {
  withdrawn: false,
  blocked: false,
  official: null,
  mine: false,
};

const importStatusSchema = z
  .object({
    withdrawn: z.boolean().catch(false),
    blocked: z.boolean().catch(false),
    official: z
      .object({ slug: z.string().min(1), title: z.string() })
      .nullable()
      .catch(null),
    mine: z.boolean().catch(false),
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
