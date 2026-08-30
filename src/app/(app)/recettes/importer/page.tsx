import { fr } from "@/i18n/fr";

import { ImportClient } from "./import-client";

const t = fr.recettes.importPage;

export default function ImportRecipePage() {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {t.title}
        </h1>
        <p className="text-sm text-ink-70">{t.intro}</p>
      </header>
      <ImportClient />
    </section>
  );
}
