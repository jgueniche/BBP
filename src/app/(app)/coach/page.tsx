import { fr } from "@/i18n/fr";

export default function CoachPage() {
  return (
    <section>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        {fr.coach.title}
      </h1>
      <p className="mt-4 text-ink-70">{fr.coach.empty}</p>
      <p className="mt-2 text-sm text-ink-50">{fr.coach.soon}</p>
    </section>
  );
}
