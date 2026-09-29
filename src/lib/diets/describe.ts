import { fr } from "@/i18n/fr";

import type { Cause } from "./rules";
import type { Finding } from "./verdict";

const r = fr.regimes;

/** « contient du porc », « peut contenir du gluten », « allergène : soja ». */
export function describeCause(cause: Cause): string {
  if (cause.kind === "dislike") return r.dislike;
  if (cause.kind === "allergen") {
    const name = r.allergens[cause.allergen].toLowerCase();
    return cause.level === "verify"
      ? `${r.mayContainPrefix} ${r.allergenPrefix} (${name})`
      : `${r.allergenPrefix} : ${name}`;
  }
  const prefix =
    cause.level === "verify" ? r.mayContainPrefix : r.containsPrefix;
  return `${prefix} ${r.contains[cause.code]}`;
}

/** Deduplicated reasons of one finding, joined for display. */
export function describeFinding(finding: Finding): string {
  return [...new Set(finding.causes.map(describeCause))].join(", ");
}

/** What to do about it: a swap, leaving it out, or checking the label. */
export function describeRemedy(finding: Finding): string {
  if (finding.substitution?.kind === "swap") {
    return `${r.swapPrefix} : ${finding.substitution.label}.`;
  }
  if (finding.substitution?.kind === "omit") return r.omit;
  return finding.level === "verify" ? r.checkLabel : "";
}
