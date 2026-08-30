"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { logWeight } from "@/app/(app)/poids/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fr } from "@/i18n/fr";

const t = fr.poids;

export function WeightEntry({ date }: { date: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const weight = parseFloat(value.replace(",", "."));
    if (!Number.isFinite(weight) || weight < 20 || weight > 500) {
      toast(t.invalidWeight);
      return;
    }
    setPending(true);
    try {
      await logWeight(date, weight);
      toast(t.logged);
      setValue("");
      router.refresh();
    } catch {
      toast(t.invalidWeight);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">
        {t.inputLabel}
        <Input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t.inputPlaceholder}
          disabled={pending}
        />
      </label>
      <Button type="submit" disabled={pending}>
        {t.log}
      </Button>
    </form>
  );
}
