"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { generateProgram } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fr } from "@/i18n/fr";

const t = fr.sport;

const selectClass =
  "rounded-[14px] border-2 border-ink bg-paper px-3 py-2 text-sm font-medium";

export function GenerateProgramDialog({ hasProgram }: { hasProgram: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [goal, setGoal] = useState<"force" | "muscle" | "perte" | "forme">(
    "forme",
  );
  const [days, setDays] = useState(3);
  const [equipment, setEquipment] = useState<
    "rien" | "elastiques" | "halteres" | "salle"
  >("rien");
  const [level, setLevel] = useState<"debutant" | "intermediaire" | "avance">(
    "debutant",
  );
  const [duration, setDuration] = useState(45);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    toast(t.generating);
    try {
      const result = await generateProgram({
        goal,
        daysPerWeek: days,
        equipment,
        level,
        durationMin: duration,
      });
      if (!result.ok) {
        toast(t.generateFailed);
        return;
      }
      toast(result.generatedBy === "ai" ? t.generated : t.generatedFallback);
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={hasProgram ? "secondary" : "default"}>
          <Sparkles />
          {hasProgram ? t.regenerate : t.generate}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.generate}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={submit}
          className="flex flex-col gap-3 text-sm font-medium"
        >
          <label className="flex flex-col gap-1.5">
            {t.goal}
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as typeof goal)}
              className={selectClass}
            >
              {Object.entries(t.goals).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            {t.daysPerWeek}
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10))}
              className={selectClass}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            {t.equipmentLabel}
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value as typeof equipment)}
              className={selectClass}
            >
              {Object.entries(t.equipments).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            {t.levelLabel}
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as typeof level)}
              className={selectClass}
            >
              {Object.entries(t.levels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            {t.duration}
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className={selectClass}
            >
              {[20, 30, 45, 60, 75, 90].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? t.generating : t.generate}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
