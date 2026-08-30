"use client";

import { useState } from "react";
import { toast } from "sonner";

import { updatePracticeSettings, updateProfileVisibility } from "./actions";
import { fr } from "@/i18n/fr";
import { cn } from "@/lib/utils/cn";

const t = fr.profil.practice;

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
}: {
  initialKashrut: boolean;
  initialCalendar: boolean;
  initialPublicProfile: boolean;
}) {
  const [kashrut, setKashrut] = useState(initialKashrut);
  const [calendar, setCalendar] = useState(initialCalendar);
  const [publicProfile, setPublicProfile] = useState(initialPublicProfile);

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
