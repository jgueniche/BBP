"use client";

import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { logActivity } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fr } from "@/i18n/fr";

const t = fr.sport;

export function QuickLog() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await logActivity(text);
      if (!result.ok) {
        toast(t.quickLogFailed);
        return;
      }
      toast(`${result.label} : ~${result.kcal} kcal, c'est noté !`);
      setText("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 rounded-lg border bg-card p-3 shadow-soft"
    >
      <Zap
        size={18}
        strokeWidth={2}
        className="shrink-0 text-ink-50"
        aria-hidden
      />
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.quickLogPlaceholder}
        aria-label={t.quickLogTitle}
      />
      <Button
        type="submit"
        size="sm"
        disabled={pending || text.trim().length < 3}
      >
        {t.quickLogAdd}
      </Button>
    </form>
  );
}
