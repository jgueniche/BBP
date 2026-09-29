import Link from "next/link";

import { fr } from "@/i18n/fr";
import { describeFinding, describeRemedy } from "@/lib/diets/describe";
import type { FoodRules } from "@/lib/diets/types";
import type { RecipeVerdict } from "@/lib/diets/verdict";

import { VerdictPill } from "./verdict-pill";

const r = fr.regimes;

/** « Pour toi »: the viewer's verdict, what to change and why. */
export function ForYouPanel({
  verdict,
  rules,
}: {
  verdict: RecipeVerdict | null;
  rules: FoodRules | null;
}) {
  if (!verdict || !rules) {
    return (
      <section className="rounded-lg bg-rose p-4 text-sm">
        <h2 className="font-display text-lg font-semibold">{r.forYou}</h2>
        <p className="mt-1 text-ink-70">{r.noRulesCta}</p>
        <Link
          href="/profil"
          className="mt-2 inline-block font-semibold text-framboise-deep underline underline-offset-2"
        >
          {r.noRulesLink}
        </Link>
      </section>
    );
  }

  const ruleNames = [
    ...rules.diets.map((d) => r.diets[d]),
    ...rules.allergens.map(
      (a) => `${r.allergenPrefix} ${r.allergens[a].toLowerCase()}`,
    ),
    ...rules.dislikes.map((word) => `${r.dislike} : ${word}`),
  ];

  return (
    <section
      aria-label={r.forYou}
      className="flex flex-col gap-3 rounded-lg bg-rose p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">{r.forYou}</h2>
        <VerdictPill status={verdict.status} />
      </div>
      <p className="text-sm text-ink-70">{r.summary[verdict.status]}</p>
      {verdict.findings.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm">
          {verdict.findings.map((finding, index) => (
            <li
              key={`${finding.label}-${index}`}
              className="rounded-md bg-card p-2.5"
            >
              <span className="font-semibold">{finding.label}</span>
              <span className="text-ink-70">
                {" "}
                : {describeFinding(finding)}.
              </span>
              {describeRemedy(finding) && (
                <span className="mt-0.5 block text-ink">
                  {describeRemedy(finding)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {verdict.notes.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-ink-70">
          {verdict.notes.map((note) => (
            <li key={note}>{r.notes[note]}</li>
          ))}
        </ul>
      )}
      {ruleNames.length > 0 && (
        <p className="text-xs text-ink-50">
          {r.yourRules} : {ruleNames.join(" · ")}
        </p>
      )}
    </section>
  );
}
