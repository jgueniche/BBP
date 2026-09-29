import { z } from "zod";

/** Same rule as the profiles_username_format check (migration 202609291400). */
const HANDLE_RE = /^[a-z0-9_][a-z0-9_.]{1,28}[a-z0-9_]$/;

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;

/** Names that would pass for the app, its team or one of its pages. */
const RESERVED_HANDLES = new Set([
  "admin",
  "administrateur",
  "aide",
  "communaute",
  "contact",
  "copine",
  "copineencuisine",
  "copine_en_cuisine",
  "copine.en.cuisine",
  "equipe",
  "journal",
  "me",
  "moderation",
  "moderatrice",
  "moi",
  "notifications",
  "officiel",
  "profil",
  "recettes",
  "support",
]);

/** « @Léa Cuisine » → « lea.cuisine »: what the handle field previews. */
export function normalizeHandle(input: string): string {
  return input
    .trim()
    .replace(/^@+/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[\s-]+/g, ".")
    .replace(/[^a-z0-9_.]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, HANDLE_MAX);
}

export type HandleCheck =
  | { ok: true; handle: string }
  | { ok: false; reason: "length" | "format" | "reserved" };

export function checkHandle(input: string): HandleCheck {
  const handle = normalizeHandle(input);
  if (handle.length < HANDLE_MIN) return { ok: false, reason: "length" };
  if (!HANDLE_RE.test(handle) || handle.includes("..")) {
    return { ok: false, reason: "format" };
  }
  if (RESERVED_HANDLES.has(handle) || handle.startsWith("copine")) {
    return { ok: false, reason: "reserved" };
  }
  return { ok: true, handle };
}

export function isUuid(value: string): boolean {
  return z.uuid().safeParse(value).success;
}

/** Profile link: the @handle when there is one, the account id otherwise. */
export function profileHref(member: {
  id: string;
  handle: string | null;
}): string {
  return `/communaute/membre/${member.handle ?? member.id}`;
}
