"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  updateCalendarSettings,
  updatePracticeSettings,
  updateProfileVisibility,
} from "./actions";
import { fr } from "@/i18n/fr";
import { cn } from "@/lib/utils/cn";

const t = fr.profil.practice;

export type CalendarPrefs = {
  city: string;
  israelCalendar: boolean;
  minorFasts: boolean;
  kitniyot: boolean;
  noFishWithMeat: boolean;
  candleOffsetMin: number;
};

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border-2 border-ink transition-colors",
        checked ? "bg-boutargue" : "bg-ink-10",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full border-2 border-ink bg-paper transition-all",
          checked ? "left-[22px]" : "left-0.5",
        )}
        aria-hidden
      />
    </button>
  );
}

export function PracticeToggles({
  initialKashrut,
  initialCalendar,
  initialPublicProfile,
  initialPrefs,
  knownCities,
}: {
  initialKashrut: boolean;
  initialCalendar: boolean;
  initialPublicProfile: boolean;
  initialPrefs: CalendarPrefs;
  knownCities: string[];
}) {
  const [kashrut, setKashrut] = useState(initialKashrut);
  const [calendar, setCalendar] = useState(initialCalendar);
  const [publicProfile, setPublicProfile] = useState(initialPublicProfile);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [savingPrefs, setSavingPrefs] = useState(false);

  async function savePrefs(next: CalendarPrefs) {
    const previous = prefs;
    setPrefs(next);
    setSavingPrefs(true);
    try {
      await updateCalendarSettings({
        city: next.city,
        israelCalendar: next.israelCalendar,
        minorFasts: next.minorFasts,
        kitniyot: next.kitniyot,
        noFishWithMeat: next.noFishWithMeat,
        candleOffsetMin: next.candleOffsetMin,
      });
      toast(t.saved);
    } catch {
      setPrefs(previous);
    } finally {
      setSavingPrefs(false);
    }
  }

  async function saveVisibility(next: boolean) {
    setPublicProfile(next);
    try {
      await updateProfileVisibility(next);
      toast(t.saved);
    } catch {
      setPublicProfile(!next);
    }
  }

  async function save(nextKashrut: boolean, nextCalendar: boolean) {
    const previous = { kashrut, calendar };
    setKashrut(nextKashrut);
    setCalendar(nextCalendar);
    try {
      await updatePracticeSettings({
        kashrutEnabled: nextKashrut,
        jewishCalendarEnabled: nextCalendar,
      });
      toast(t.saved);
    } catch {
      setKashrut(previous.kashrut);
      setCalendar(previous.calendar);
    }
  }

  return (
    <div className="rounded-[20px] border-2 border-ink bg-paper p-4 shadow-sticker">
      <h2 className="font-display text-base font-extrabold">{t.title}</h2>
      <p className="mt-0.5 text-xs text-ink-50">{t.intro}</p>
      <div className="mt-3 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{t.kashrut}</p>
            <p className="text-xs text-ink-50">{t.kashrutHint}</p>
          </div>
          <Toggle
            checked={kashrut}
            onChange={(next) => save(next, calendar)}
            label={t.kashrut}
          />
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{t.calendar}</p>
            <p className="text-xs text-ink-50">{t.calendarHint}</p>
          </div>
          <Toggle
            checked={calendar}
            onChange={(next) => save(kashrut, next)}
            label={t.calendar}
          />
        </div>
        {calendar && (
          <div className="flex flex-col gap-3 rounded-[16px] border-2 border-ink-10 p-3">
            <div>
              <label htmlFor="practice-city" className="text-sm font-semibold">
                {t.city}
              </label>
              <p className="text-xs text-ink-50">{t.cityHint}</p>
              <input
                id="practice-city"
                list="practice-cities"
                defaultValue={prefs.city}
                disabled={savingPrefs}
                onBlur={(event) => {
                  const value = event.target.value.trim();
                  if (value !== prefs.city)
                    savePrefs({ ...prefs, city: value });
                }}
                className="mt-1.5 w-full rounded-[12px] border-2 border-ink bg-paper px-3 py-1.5 text-sm"
                placeholder="Paris"
              />
              <datalist id="practice-cities">
                {knownCities.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{t.israel}</p>
                <p className="text-xs text-ink-50">{t.israelHint}</p>
              </div>
              <Toggle
                checked={prefs.israelCalendar}
                onChange={(next) =>
                  savePrefs({ ...prefs, israelCalendar: next })
                }
                label={t.israel}
              />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{t.minorFasts}</p>
                <p className="text-xs text-ink-50">{t.minorFastsHint}</p>
              </div>
              <Toggle
                checked={prefs.minorFasts}
                onChange={(next) => savePrefs({ ...prefs, minorFasts: next })}
                label={t.minorFasts}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{t.candleOffset}</p>
                <p className="text-xs text-ink-50">{t.candleOffsetHint}</p>
              </div>
              <select
                aria-label={t.candleOffset}
                value={prefs.candleOffsetMin}
                disabled={savingPrefs}
                onChange={(event) =>
                  savePrefs({
                    ...prefs,
                    candleOffsetMin: parseInt(event.target.value, 10),
                  })
                }
                className="rounded-[12px] border-2 border-ink bg-paper px-2 py-1 font-mono text-sm"
              >
                {[18, 20, 30, 40].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    −{minutes} min
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {kashrut && (
          <div className="flex flex-col gap-3 rounded-[16px] border-2 border-ink-10 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{t.kitniyot}</p>
                <p className="text-xs text-ink-50">{t.kitniyotHint}</p>
              </div>
              <Toggle
                checked={prefs.kitniyot}
                onChange={(next) => savePrefs({ ...prefs, kitniyot: next })}
                label={t.kitniyot}
              />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{t.noFishMeat}</p>
                <p className="text-xs text-ink-50">{t.noFishMeatHint}</p>
              </div>
              <Toggle
                checked={prefs.noFishWithMeat}
                onChange={(next) =>
                  savePrefs({ ...prefs, noFishWithMeat: next })
                }
                label={t.noFishMeat}
              />
            </div>
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{t.visibility}</p>
            <p className="text-xs text-ink-50">{t.visibilityHint}</p>
          </div>
          <Toggle
            checked={publicProfile}
            onChange={saveVisibility}
            label={t.visibility}
          />
        </div>
      </div>
    </div>
  );
}
