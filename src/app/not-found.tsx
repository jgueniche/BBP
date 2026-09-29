import Link from "next/link";

import { CopineAvatar } from "@/components/illustrations/copine-avatar";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <CopineAvatar size={96} />
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {fr.notFound.title}
      </h1>
      <p className="text-ink-70">{fr.notFound.body}</p>
      <Button asChild>
        <Link href="/accueil">{fr.notFound.cta}</Link>
      </Button>
    </main>
  );
}
