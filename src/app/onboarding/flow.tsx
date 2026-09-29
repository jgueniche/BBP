"use client";

import { useState, useTransition } from "react";

import { CoachBubble } from "@/components/coach/coach-bubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fr } from "@/i18n/fr";

import { completeOnboarding } from "./actions";

const t = fr.onboarding;

// Express onboarding (pivot, ADR-029): a first name and the 16+ declaration.
// Cooking rules, allergies and household come later, when they are useful.
export function OnboardingFlow() {
  const [displayName, setDisplayName] = useState("");
  const [isSixteenOrOlder, setIsSixteenOrOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canSubmit = displayName.trim().length > 0 && isSixteenOrOlder;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await completeOnboarding({
        displayName: displayName.trim(),
        isSixteenOrOlder: true,
      });
      if (result && !result.ok) setError(t.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-medium tracking-tight">
        {t.welcomeTitle}
      </h1>
      <CoachBubble>{t.welcomeCopine}</CoachBubble>

      <form
        onSubmit={submit}
        className="flex flex-col gap-5 rounded-lg border bg-card p-5 shadow-soft"
      >
        <label className="flex flex-col gap-2 font-medium" htmlFor="name">
          {t.nameLabel}
          <Input
            id="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={t.namePlaceholder}
            maxLength={40}
            autoComplete="given-name"
            required
          />
        </label>

        <label className="flex items-start gap-3 text-sm" htmlFor="age">
          <input
            id="age"
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--primary)]"
            checked={isSixteenOrOlder}
            onChange={(event) => setIsSixteenOrOlder(event.target.checked)}
          />
          <span>{t.ageLabel}</span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-warn">
            {error}
          </p>
        )}

        <Button type="submit" disabled={!canSubmit || pending}>
          {pending ? t.submitting : t.submit}
        </Button>
        <p className="text-xs text-ink-50">{t.later}</p>
      </form>
    </div>
  );
}
