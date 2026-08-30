"use client";

import { useState } from "react";

import { deleteAccountData } from "@/app/(app)/profil/actions";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

export function DeleteAccountButton() {
  const [pending, setPending] = useState(false);

  async function onDelete() {
    const answer = window.prompt(fr.profil.deleteConfirmLabel);
    if (answer !== "SUPPRIMER") return;
    setPending(true);
    await deleteAccountData();
  }

  return (
    <Button variant="outline" size="sm" onClick={onDelete} disabled={pending}>
      {fr.profil.deleteData}
    </Button>
  );
}
