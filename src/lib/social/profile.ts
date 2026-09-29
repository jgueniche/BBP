import { z } from "zod";

import { checkHandle } from "./handles";

export const BIO_MAX = 160;
export const DISPLAY_NAME_MAX = 40;

const rawSchema = z.object({
  displayName: z.string().max(200),
  handle: z.string().max(200),
  bio: z.string().max(1000),
});

export type ProfileInput = {
  displayName: string;
  handle: string | null;
  bio: string | null;
};

export type ProfileInputResult =
  | { ok: true; value: ProfileInput }
  | {
      ok: false;
      field: "displayName" | "handle" | "bio";
      reason: "required" | "length" | "format" | "reserved";
    };

/** « Mon profil » form: name required, handle and bio optional. */
export function parseProfileInput(raw: unknown): ProfileInputResult {
  const parsed = rawSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, field: "displayName", reason: "format" };
  const displayName = parsed.data.displayName.trim().replace(/\s+/g, " ");
  if (displayName.length === 0) {
    return { ok: false, field: "displayName", reason: "required" };
  }
  if (displayName.length > DISPLAY_NAME_MAX) {
    return { ok: false, field: "displayName", reason: "length" };
  }
  const bio = parsed.data.bio.trim();
  if (bio.length > BIO_MAX)
    return { ok: false, field: "bio", reason: "length" };
  let handle: string | null = null;
  if (parsed.data.handle.trim().replace(/^@+/, "").length > 0) {
    const check = checkHandle(parsed.data.handle);
    if (!check.ok) return { ok: false, field: "handle", reason: check.reason };
    handle = check.handle;
  }
  return {
    ok: true,
    value: { displayName, handle, bio: bio.length > 0 ? bio : null },
  };
}
