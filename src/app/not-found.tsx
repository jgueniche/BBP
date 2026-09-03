import Link from "next/link";

import { KemiaAvatar } from "@/components/illustrations/kemia-avatar";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <KemiaAvatar expression="surprise" size={96} />
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        {fr.notFound.title}
      </h1>
      <p className="text-ink-70">{fr.notFound.body}</p>
      <Button asChild>
        <Link href="/accueil">{fr.notFound.cta}</Link>
      </Button>
    </main>
  );
}
