import { fr } from "@/i18n/fr";

export default function PlanningPage() {
  return (
    <section>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        {fr.planning.title}
      </h1>
      <p className="mt-4 text-ink-70">{fr.planning.empty}</p>
      <p className="mt-2 text-sm text-ink-50">{fr.planning.soon}</p>
    </section>
  );
}
