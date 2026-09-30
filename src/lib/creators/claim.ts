import type { CreatorPlatform } from "./identity";

/** Letters and digits that cannot be misread (no 0/o, 1/l/i). */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const CODE_LENGTH = 8;

/** « copine-7f3kq2ab »: what the creator adds to her bio or her site. */
export function generateClaimCode(
  random: (size: number) => Uint8Array = (size) =>
    globalThis.crypto.getRandomValues(new Uint8Array(size)),
): string {
  const bytes = random(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `copine-${code}`;
}

/** A website proves itself (home page); an account is checked by the team. */
export function claimMethod(platform: CreatorPlatform): "site" | "bio" {
  return platform === "web" ? "site" : "bio";
}

export function siteHomeUrl(domain: string): string {
  return `https://${domain}/`;
}

/** The code anywhere in the page (a meta tag, the footer…), any case. */
export function pageHasClaimCode(html: string, code: string): boolean {
  return html.toLowerCase().includes(code.toLowerCase());
}
