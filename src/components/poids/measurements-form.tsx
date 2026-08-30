"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { logMeasurements } from "@/app/(app)/poids/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fr } from "@/i18n/fr";

const t = fr.poids;

const FIELDS = [
  "waist_cm",
  "hips_cm",
  "chest_cm",
  "arm_cm",
  "thigh_cm",
] as const;

type Field = (typeof FIELDS)[number];

export function MeasurementsForm({ date }: { date: string }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({
    waist_cm: "",
    hips_cm: "",
    chest_cm: "",
    arm_cm: "",
    thigh_cm: "",
  });
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = Object.fromEntries(
      FIELDS.map((field) => {
        const raw = values[field].replace(",", ".").trim();
        const value = raw ? parseFloat(raw) : NaN;
        return [field, Number.isFinite(value) ? value : null];
      }),
    ) as Record<Field, number | null>;

    if (Object.values(parsed).every((v) => v === null)) return;

    setPending(true);
    try {
      await logMeasurements(date, parsed);
      toast(t.measuresSaved);
      setValues({
        waist_cm: "",
        hips_cm: "",
        chest_cm: "",
        arm_cm: "",
        thigh_cm: "",
      });
      router.refresh();
    } catch {
      toast(t.invalidWeight);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FIELDS.map((field) => (
          <label
            key={field}
            className="flex flex-col gap-1.5 text-xs font-medium"
          >
            {t.measures[field]}
            <Input
              inputMode="decimal"
              value={values[field]}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [field]: e.target.value }))
              }
              disabled={pending}
            />
          </label>
        ))}
      </div>
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        className="self-start"
        disabled={pending}
      >
        {t.measuresSave}
      </Button>
    </form>
  );
}
