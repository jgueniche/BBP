import { isAiConfigured } from "@/ai/provider";
import { fr } from "@/i18n/fr";
import { parseSharedImport, type SharedPayload } from "@/lib/pwa/share-target";

import { importQuota, listImportJobs } from "../import-actions";
import { ImportClient } from "./import-client";

const t = fr.recettes.importPage;

// Import jobs run right after the action answers (after()): room for a
// page, the AI and one rewrite.
export const maxDuration = 60;

// Web Share Target (manifest): shared links or text land here with
// ?url=&text=&title= and prefill the importer. « Publier ma version » (her
// creator space) adds &credit=@her.handle.
export default async function ImportRecipePage({
  searchParams,
}: {
  searchParams: Promise<SharedPayload & { credit?: string | string[] }>;
}) {
  const params = await searchParams;
  const shared = parseSharedImport(params);
  const credit = (
    Array.isArray(params.credit) ? params.credit[0] : params.credit
  )
    ?.trim()
    .slice(0, 60);
  const [jobs, quota] = await Promise.all([listImportJobs(), importQuota()]);
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t.title}
        </h1>
        <p className="text-sm text-ink-70">{t.intro}</p>
      </header>
      <ImportClient
        shared={shared}
        initialCredit={credit ?? ""}
        aiEnabled={isAiConfigured()}
        jobs={jobs}
        quota={quota}
      />
    </section>
  );
}
