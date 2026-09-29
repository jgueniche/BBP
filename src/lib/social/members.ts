import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";

import { avatarPublicUrl } from "./avatars";
import { isUuid } from "./handles";

type Supabase = SupabaseClient<Database>;

/** What others may know of a member: nothing unless the profile is public. */
export type MemberSummary = {
  id: string;
  name: string | null;
  handle: string | null;
  avatarUrl: string | null;
};

export function anonymousMember(id: string): MemberSummary {
  return { id, name: null, handle: null, avatarUrl: null };
}

/** Public profiles (and one's own) by id; RLS hides the private ones. */
export async function loadMembers(
  supabase: Supabase,
  ids: string[],
): Promise<Map<string, MemberSummary>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .in("id", unique);
  return new Map(
    (data ?? []).map((p) => [
      p.id,
      {
        id: p.id,
        name: p.display_name ?? p.username ?? null,
        handle: p.username,
        avatarUrl: avatarPublicUrl(p.avatar_url),
      },
    ]),
  );
}

export type MemberProfile = MemberSummary & {
  bio: string | null;
  isPublic: boolean;
};

/**
 * A profile from its @handle or its id. A handle only resolves for a public
 * profile; an id always gives a page, « Membre » when the profile is private.
 */
export async function resolveMember(
  supabase: Supabase,
  handleOrId: string,
): Promise<MemberProfile | null> {
  const key = decodeURIComponent(handleOrId).replace(/^@/, "").toLowerCase();
  const byId = isUuid(key);
  const query = supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, bio, visibility");
  const { data } = await (
    byId ? query.eq("id", key) : query.eq("username", key)
  ).maybeSingle();
  if (!data) {
    return byId
      ? { ...anonymousMember(key), bio: null, isPublic: false }
      : null;
  }
  return {
    id: data.id,
    name: data.display_name ?? data.username ?? null,
    handle: data.username,
    avatarUrl: avatarPublicUrl(data.avatar_url),
    bio: data.bio,
    isPublic: data.visibility === "public",
  };
}

export type ProfileCounts = {
  followers: number;
  following: number;
  recipes: number;
  cooked: number;
};

/** Counters of a public profile or of one's own, null otherwise. */
export async function loadProfileCounts(
  supabase: Supabase,
  id: string,
): Promise<ProfileCounts | null> {
  const { data } = await supabase.rpc("profile_counts", { uid: id });
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  const count = (key: string) =>
    typeof value[key] === "number" ? (value[key] as number) : 0;
  return {
    followers: count("followers"),
    following: count("following"),
    recipes: count("recipes"),
    cooked: count("cooked"),
  };
}
