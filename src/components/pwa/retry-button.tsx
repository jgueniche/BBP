"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

export function RetryButton() {
  return (
    <Button type="button" onClick={() => window.location.reload()}>
      <RotateCcw />
      {fr.pwa.offline.retry}
    </Button>
  );
}
