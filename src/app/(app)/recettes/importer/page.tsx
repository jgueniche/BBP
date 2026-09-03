import { fr } from "@/i18n/fr";
import { parseSharedImport, type SharedPayload } from "@/lib/pwa/share-target";

import { ImportClient } from "./import-client";

const t = fr.recettes.importPage;

// Web Share Target (manifest): shared links or text land here with
// ?url=&text=&title= and prefill the importer.
export default async function ImportRecipePage({
  searchParams,
}: {
  searchParams: Promise<SharedPayload>;
}) {
  const shared = parseSharedImport(await searchParams);
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {t.title}
        </h1>
        <p className="text-sm text-ink-70">{t.intro}</p>
      </header>
      <ImportClient shared={shared} />
    </section>
  );
}
