"use client";

import { useMemo, useState } from "react";

import { CoachBubble } from "@/components/coach/coach-bubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fr } from "@/i18n/fr";
import {
  ageFromBirthYear,
  clampWeeklyRate,
  computeCalorieTarget,
  computeProteinTarget,
  computeTdee,
  type ActivityLevel,
  type Gender,
  type GoalType,
} from "@/lib/nutrition/tdee";
import { cn } from "@/lib/utils/cn";

import { completeOnboarding, type OnboardingInput } from "./actions";

const t = fr.onboarding;

const STEPS = [
  "welcome",
  "consent",
  "profile",
  "goal",
  "activity",
  "mode",
  "kashrut",
  "allergies",
  "recap",
] as const;

type Step = (typeof STEPS)[number];

type FlowState = {
  displayName: string;
  gender: Gender;
  birthYear: string;
  heightCm: string;
  weightKg: string;
  city: string;
  consent: boolean;
  medicalFlags: Record<
    "pregnancy" | "breastfeeding" | "diabetes" | "ed_history" | "other",
    boolean
  >;
  goalType: GoalType;
  targetWeightKg: string;
  weeklyRatePct: number;
  activityLevel: ActivityLevel;
  mode: "proteine" | "boutargue";
  shomerShabbat: boolean;
  meatWaitHours: 6 | 5.5 | 3 | 1;
  noFishWithMeat: boolean;
  kitniyot: boolean;
  israelCalendar: boolean;
  allergies: string;
  dislikes: string;
};

const initialState: FlowState = {
  displayName: "",
  gender: "femme",
  birthYear: "",
  heightCm: "",
  weightKg: "",
  city: "",
  consent: false,
  medicalFlags: {
    pregnancy: false,
    breastfeeding: false,
    diabetes: false,
    ed_history: false,
    other: false,
  },
  goalType: "perte",
  targetWeightKg: "",
  weeklyRatePct: 0.5,
  activityLevel: "leger",
  mode: "proteine",
  shomerShabbat: true,
  meatWaitHours: 6,
  noFishWithMeat: false,
  kitniyot: true,
  israelCalendar: false,
  allergies: "",
  dislikes: "",
};

function num(value: string): number {
  return parseFloat(value.replace(",", "."));
}

function splitList(value: string): string[] {
  return value
    .split(/[,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

const optionCardClass = (active: boolean) =>
  cn(
    "w-full rounded-lg border bg-card p-4 text-left transition-colors",
    active ? "bg-boutargue-tint shadow-soft" : "hover:bg-ink-10",
  );

const checkboxRowClass =
  "flex items-center gap-3 rounded-[10px] border p-3 text-sm font-medium";

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>("welcome");
  const [state, setState] = useState<FlowState>(initialState);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooYoung, setTooYoung] = useState(false);

  const stepIndex = STEPS.indexOf(step);

  function update<K extends keyof FlowState>(key: K, value: FlowState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  const age = state.birthYear
    ? ageFromBirthYear(parseInt(state.birthYear, 10))
    : null;
  const hasMedicalFlag = Object.values(state.medicalFlags).some(Boolean);
  const generalMode = hasMedicalFlag || (age !== null && age < 18);

  const preview = useMemo(() => {
    const weight = num(state.weightKg);
    const height = num(state.heightCm);
    if (!age || !weight || !height) return null;
    const tdee = computeTdee({
      gender: state.gender,
      weightKg: weight,
      heightCm: height,
      age,
      activityLevel: state.activityLevel,
    });
    if (generalMode)
      return { tdee, target: null, protein: null, clamped: false };
    const goalType = state.goalType;
    const { calorieTarget, clamped } = computeCalorieTarget({
      tdee,
      gender: state.gender,
      weightKg: weight,
      goalType,
      weeklyRatePct: clampWeeklyRate(state.weeklyRatePct),
    });
    return {
      tdee,
      target: calorieTarget,
      protein: computeProteinTarget(weight, goalType),
      clamped,
    };
  }, [age, generalMode, state]);

  const canContinue: boolean = (() => {
    switch (step) {
      case "welcome":
        return true;
      case "consent":
        return state.consent;
      case "profile":
        return (
          state.displayName.trim().length > 0 &&
          Boolean(state.birthYear) &&
          num(state.heightCm) >= 100 &&
          num(state.weightKg) >= 30
        );
      case "goal":
        return state.goalType !== "perte" || Boolean(state.targetWeightKg);
      default:
        return true;
    }
  })();

  function next() {
    if (step === "profile" && age !== null && age < 16) {
      setTooYoung(true);
      return;
    }
    setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)]!);
  }

  function back() {
    setStep(STEPS[Math.max(stepIndex - 1, 0)]!);
  }

  async function submit() {
    setPending(true);
    setError(null);
    const payload: OnboardingInput = {
      displayName: state.displayName.trim(),
      gender: state.gender,
      birthYear: parseInt(state.birthYear, 10),
      heightCm: num(state.heightCm),
      weightKg: num(state.weightKg),
      city: state.city.trim(),
      consent: true,
      medicalFlags: state.medicalFlags,
      goalType: state.goalType,
      targetWeightKg: state.targetWeightKg ? num(state.targetWeightKg) : null,
      weeklyRatePct: state.goalType === "perte" ? state.weeklyRatePct : null,
      activityLevel: state.activityLevel,
      mode: state.mode,
      meatWaitHours: state.meatWaitHours,
      shomerShabbat: state.shomerShabbat,
      noFishWithMeat: state.noFishWithMeat,
      kitniyot: state.kitniyot,
      israelCalendar: state.israelCalendar,
      allergies: splitList(state.allergies),
      dislikes: splitList(state.dislikes),
    };
    try {
      const result = await completeOnboarding(payload);
      if (result && !result.ok && result.code === "too_young") {
        setTooYoung(true);
      }
    } catch (submitError) {
      // completeOnboarding redirects on success, which throws NEXT_REDIRECT.
      if (
        submitError instanceof Error &&
        submitError.message.includes("NEXT_REDIRECT")
      ) {
        throw submitError;
      }
      setError(t.error);
    } finally {
      setPending(false);
    }
  }

  if (tooYoung) {
    return (
      <section className="rounded-lg border bg-card p-6 shadow-soft">
        <h1 className="font-display text-2xl font-extrabold">
          {t.tooYoungTitle}
        </h1>
        <p className="mt-3 text-ink-70">{t.tooYoungBody}</p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-6 flex gap-1.5" aria-hidden>
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i <= stepIndex ? "bg-boutargue" : "bg-ink-10",
            )}
          />
        ))}
      </div>

      {step === "welcome" && (
        <div className="flex flex-col gap-6">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            {t.welcomeTitle}
          </h1>
          <CoachBubble expression="sourire">{t.welcomeKemia}</CoachBubble>
        </div>
      )}

      {step === "consent" && (
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-2xl font-extrabold">
            {t.consentTitle}
          </h1>
          <p className="text-sm text-ink-70">{t.consentBody}</p>
          <p className="rounded-lg bg-ink-10 p-3 text-xs text-ink-70">
            {t.consentDisclaimer}
          </p>
          <label className={checkboxRowClass}>
            <input
              type="checkbox"
              checked={state.consent}
              onChange={(e) => update("consent", e.target.checked)}
              className="size-5 accent-[#F26A1B]"
            />
            {t.consentCheckbox}
          </label>
          <p className="mt-2 text-sm font-medium">{t.consentMedicalTitle}</p>
          {(
            Object.keys(state.medicalFlags) as Array<
              keyof FlowState["medicalFlags"]
            >
          ).map((flag) => (
            <label key={flag} className={checkboxRowClass}>
              <input
                type="checkbox"
                checked={state.medicalFlags[flag]}
                onChange={(e) =>
                  update("medicalFlags", {
                    ...state.medicalFlags,
                    [flag]: e.target.checked,
                  })
                }
                className="size-5 accent-[#F26A1B]"
              />
              {t.flags[flag]}
            </label>
          ))}
        </div>
      )}

      {step === "profile" && (
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-2xl font-extrabold">
            {t.profileTitle}
          </h1>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t.displayName}
            <Input
              value={state.displayName}
              onChange={(e) => update("displayName", e.target.value)}
            />
          </label>
          <fieldset className="flex flex-col gap-1.5 text-sm font-medium">
            <legend className="mb-1.5">{t.gender}</legend>
            <div className="flex gap-2">
              {(["femme", "homme", "autre"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => update("gender", g)}
                  className={cn(
                    "flex-1 rounded-full border px-3 py-2 text-sm font-semibold",
                    state.gender === g ? "bg-boutargue-tint" : "bg-card",
                  )}
                >
                  {t.genders[g]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              {t.birthYear}
              <Input
                inputMode="numeric"
                value={state.birthYear}
                onChange={(e) => update("birthYear", e.target.value)}
                placeholder="1990"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              {t.height}
              <Input
                inputMode="decimal"
                value={state.heightCm}
                onChange={(e) => update("heightCm", e.target.value)}
                placeholder="172"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              {t.weight}
              <Input
                inputMode="decimal"
                value={state.weightKg}
                onChange={(e) => update("weightKg", e.target.value)}
                placeholder="78"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t.city}
            <Input
              value={state.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder={t.cityPlaceholder}
            />
          </label>
          {age !== null && age >= 16 && age < 18 && (
            <p className="rounded-lg bg-boutargue-tint p-3 text-sm text-[#3d3d3d]">
              {t.minorNote}
            </p>
          )}
        </div>
      )}

      {step === "goal" && (
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-2xl font-extrabold">
            {t.goalTitle}
          </h1>
          {(["perte", "maintien", "recomp"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => update("goalType", g)}
              className={optionCardClass(state.goalType === g)}
            >
              <span className="font-semibold">{t.goalTypes[g]}</span>
            </button>
          ))}
          {state.goalType === "perte" && !generalMode && (
            <>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                {t.targetWeight}
                <Input
                  inputMode="decimal"
                  value={state.targetWeightKg}
                  onChange={(e) => update("targetWeightKg", e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                {t.weeklyRate} :{" "}
                {state.weeklyRatePct.toFixed(2).replace(".", ",")} %
                <input
                  type="range"
                  min={0.25}
                  max={1}
                  step={0.05}
                  value={state.weeklyRatePct}
                  onChange={(e) =>
                    update("weeklyRatePct", parseFloat(e.target.value))
                  }
                  className="accent-[#F26A1B]"
                />
                <span className="text-xs font-normal text-ink-50">
                  {t.weeklyRateHint}
                </span>
              </label>
            </>
          )}
          {generalMode && (
            <p className="rounded-lg bg-boutargue-tint p-3 text-sm text-[#3d3d3d]">
              {t.recapNoTarget}
            </p>
          )}
        </div>
      )}

      {step === "activity" && (
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-2xl font-extrabold">
            {t.activityTitle}
          </h1>
          {(
            ["sedentaire", "leger", "modere", "actif", "tres_actif"] as const
          ).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => update("activityLevel", a)}
              className={optionCardClass(state.activityLevel === a)}
            >
              {t.activities[a]}
            </button>
          ))}
        </div>
      )}

      {step === "mode" && (
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-2xl font-extrabold">
            {t.modeTitle}
          </h1>
          <button
            type="button"
            onClick={() => update("mode", "proteine")}
            className={optionCardClass(state.mode === "proteine")}
          >
            <span className="font-display text-lg font-extrabold">
              {t.modeProteine}
            </span>
            <p className="mt-1 text-sm text-ink-70">{t.modeProteineDesc}</p>
          </button>
          <button
            type="button"
            onClick={() => update("mode", "boutargue")}
            className={optionCardClass(state.mode === "boutargue")}
          >
            <span className="font-display text-lg font-extrabold">
              {t.modeBoutargue}
            </span>
            <p className="mt-1 text-sm text-ink-70">{t.modeBoutargueDesc}</p>
          </button>
        </div>
      )}

      {step === "kashrut" && (
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-2xl font-extrabold">
            {t.kashrutTitle}
          </h1>
          <p className="text-sm text-ink-70">{t.kashrutIntro}</p>
          <label className={checkboxRowClass}>
            <input
              type="checkbox"
              checked={state.shomerShabbat}
              onChange={(e) => update("shomerShabbat", e.target.checked)}
              className="size-5 accent-[#F26A1B]"
            />
            {t.shomerShabbat}
          </label>
          <fieldset className="flex flex-col gap-1.5 text-sm font-medium">
            <legend className="mb-1.5">{t.meatWait}</legend>
            <div className="grid grid-cols-4 gap-2">
              {([6, 5.5, 3, 1] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => update("meatWaitHours", h)}
                  className={cn(
                    "rounded-full border px-2 py-2 text-sm font-semibold",
                    state.meatWaitHours === h
                      ? "bg-boutargue-tint"
                      : "bg-card",
                  )}
                >
                  {t.meatWaitOptions[`${h}` as keyof typeof t.meatWaitOptions]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className={checkboxRowClass}>
            <input
              type="checkbox"
              checked={state.noFishWithMeat}
              onChange={(e) => update("noFishWithMeat", e.target.checked)}
              className="size-5 accent-[#F26A1B]"
            />
            {t.noFishWithMeat}
          </label>
          <label className={checkboxRowClass}>
            <input
              type="checkbox"
              checked={state.kitniyot}
              onChange={(e) => update("kitniyot", e.target.checked)}
              className="size-5 accent-[#F26A1B]"
            />
            {t.kitniyot}
          </label>
          <label className={checkboxRowClass}>
            <input
              type="checkbox"
              checked={state.israelCalendar}
              onChange={(e) => update("israelCalendar", e.target.checked)}
              className="size-5 accent-[#F26A1B]"
            />
            {t.israelCalendar}
          </label>
        </div>
      )}

      {step === "allergies" && (
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-2xl font-extrabold">
            {t.allergiesTitle}
          </h1>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t.allergies}
            <Input
              value={state.allergies}
              onChange={(e) => update("allergies", e.target.value)}
              placeholder={t.allergiesPlaceholder}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t.dislikes}
            <Input
              value={state.dislikes}
              onChange={(e) => update("dislikes", e.target.value)}
              placeholder={t.dislikesPlaceholder}
            />
          </label>
        </div>
      )}

      {step === "recap" && (
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-2xl font-extrabold">
            {t.recapTitle}
          </h1>
          {preview && (
            <div className="rounded-lg border bg-card p-4 shadow-soft">
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-70">{t.recapTdee}</dt>
                  <dd className="font-mono font-semibold">
                    ~{preview.tdee} kcal
                  </dd>
                </div>
                {preview.target !== null ? (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-ink-70">{t.recapTarget}</dt>
                      <dd className="font-mono font-semibold">
                        {preview.target} kcal/j
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-70">{t.recapProtein}</dt>
                      <dd className="font-mono font-semibold">
                        {preview.protein} g/j
                      </dd>
                    </div>
                  </>
                ) : (
                  <p className="text-ink-70">{t.recapNoTarget}</p>
                )}
              </dl>
              {preview.clamped && (
                <p className="mt-3 rounded-[10px] bg-boutargue-tint p-2 text-xs text-[#3d3d3d]">
                  {t.recapClamped}
                </p>
              )}
            </div>
          )}
          <CoachBubble expression="fiere">{t.recapKemia}</CoachBubble>
          {error && <p className="text-sm font-medium text-warn">{error}</p>}
        </div>
      )}

      <div className="mt-8 flex items-center gap-3">
        {stepIndex > 0 && (
          <Button variant="ghost" onClick={back} disabled={pending}>
            {t.back}
          </Button>
        )}
        <div className="flex-1" />
        {step === "recap" ? (
          <Button onClick={submit} disabled={pending}>
            {pending ? t.saving : t.finish}
          </Button>
        ) : (
          <Button onClick={next} disabled={!canContinue}>
            {step === "welcome" ? t.welcomeCta : t.next}
          </Button>
        )}
      </div>
    </section>
  );
}
