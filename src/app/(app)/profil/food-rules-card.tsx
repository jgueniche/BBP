"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { fr } from "@/i18n/fr";
import { ALLERGENS, DIETS, type Allergen, type Diet } from "@/lib/diets/types";
import { cn } from "@/lib/utils/cn";

import { clearFoodRules, saveFoodRules } from "./actions";

const t = fr.profil.rules;
const r = fr.regimes;

type Rules = { diets: Diet[]; allergens: Allergen[]; dislikes: string[] };

export function FoodRulesCard({
  initial,
  initialConsent,
}: {
  initial: Rules;
  initialConsent: boolean;
}) {
  const [rules, setRules] = useState<Rules>(initial);
  const [consented, setConsented] = useState(initialConsent);
  const [pending, setPending] = useState<Rules | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");

  async function persist(next: Rules, consent: boolean) {
    const previous = rules;
    setRules(next);
    setSaving(true);
    try {
      const result = await saveFoodRules({ ...next, consent });
      if (!result.ok) {
        setRules(previous);
        if (result.code === "consent_required") setPending(next);
        return;
      }
      if (consent) setConsented(true);
      toast(t.saved);
    } catch {
      setRules(previous);
      toast(t.error);
    } finally {
      setSaving(false);
    }
  }

  function change(next: Rules) {
    const sensitive = next.diets.length + next.allergens.length > 0;
    // Diets and allergies wait for an explicit consent (GDPR art. 9).
    if (sensitive && !consented) {
      setPending(next);
      return;
    }
    void persist(next, false);
  }

  function toggleDiet(diet: Diet) {
    const diets = rules.diets.includes(diet)
      ? rules.diets.filter((d) => d !== diet)
      : [...rules.diets, diet];
    change({ ...rules, diets });
  }

  function toggleAllergen(allergen: Allergen) {
    const allergens = rules.allergens.includes(allergen)
      ? rules.allergens.filter((a) => a !== allergen)
      : [...rules.allergens, allergen];
    change({ ...rules, allergens });
  }

  function addDislike() {
    const word = draft.trim();
    if (word.length < 2 || rules.dislikes.length >= 20) return;
    setDraft("");
    if (rules.dislikes.some((d) => d.toLowerCase() === word.toLowerCase())) {
      return;
    }
    change({ ...rules, dislikes: [...rules.dislikes, word] });
  }

  async function clearAll() {
    setSaving(true);
    try {
      await clearFoodRules();
      setRules({ diets: [], allergens: [], dislikes: [] });
      setConsented(false);
      setPending(null);
      toast(t.cleared);
    } catch {
      toast(t.error);
    } finally {
      setSaving(false);
    }
  }

  const empty =
    rules.diets.length + rules.allergens.length + rules.dislikes.length === 0;

  return (
    <section className="flex flex-col gap-4 rounded-lg bg-lilas p-4">
      <div>
        <h2 className="font-display text-base font-semibold">
          {t.title}{" "}
          <span className="font-sans text-xs font-normal text-ink-50">
            · {t.optional}
          </span>
        </h2>
        <p className="mt-0.5 text-xs text-ink-70">{t.intro}</p>
      </div>

      {pending && (
        <div
          role="alertdialog"
          aria-labelledby="rules-consent-title"
          className="flex flex-col gap-2 rounded-lg border bg-card p-3"
        >
          <p id="rules-consent-title" className="text-sm font-semibold">
            {t.consentTitle}
          </p>
          <p className="text-xs text-ink-70">{t.consentBody}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={saving}
              onClick={() => {
                const next = pending;
                setPending(null);
                void persist(next, true);
              }}
            >
              {t.consentAccept}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
              {t.consentCancel}
            </Button>
          </div>
        </div>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-50">
          {t.dietsTitle}
        </legend>
        {DIETS.map((diet) => (
          <div key={diet} className="flex items-center justify-between gap-3">
            <span className="text-sm">{r.diets[diet]}</span>
            <Switch
              checked={rules.diets.includes(diet)}
              onChange={() => toggleDiet(diet)}
              label={r.diets[diet]}
              disabled={saving}
            />
          </div>
        ))}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-50">
          {t.allergensTitle}
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {ALLERGENS.map((allergen) => {
            const active = rules.allergens.includes(allergen);
            return (
              <button
                key={allergen}
                type="button"
                aria-pressed={active}
                disabled={saving}
                onClick={() => toggleAllergen(allergen)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-diet-border bg-card",
                )}
              >
                {r.allergens[allergen]}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-ink-50">{t.allergensHint}</p>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-50">
          {t.dislikesTitle}
        </legend>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            addDislike();
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={40}
            placeholder={t.dislikesPlaceholder}
            aria-label={t.dislikesTitle}
            className="min-w-0 flex-1 rounded-[10px] border bg-card px-3 py-1.5 text-sm"
          />
          <Button type="submit" size="sm" variant="secondary" disabled={saving}>
            {t.dislikesAdd}
          </Button>
        </form>
        {rules.dislikes.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {rules.dislikes.map((word) => (
              <li
                key={word}
                className="inline-flex items-center gap-1 rounded-full border border-diet-border bg-card py-0.5 pl-2.5 pr-1 text-xs"
              >
                {word}
                <button
                  type="button"
                  aria-label={`${t.dislikeRemove} ${word}`}
                  disabled={saving}
                  onClick={() =>
                    change({
                      ...rules,
                      dislikes: rules.dislikes.filter((d) => d !== word),
                    })
                  }
                  className="flex size-6 items-center justify-center rounded-full text-ink-50"
                >
                  <X size={12} strokeWidth={2} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {!empty && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          disabled={saving}
          onClick={clearAll}
        >
          {t.clear}
        </Button>
      )}
    </section>
  );
}
