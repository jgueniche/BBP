import { fr } from "@/i18n/fr";

const t = fr.communaute.charte;

export default function ChartePage() {
  return (
    <section className="flex w-full max-w-3xl flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        {t.title}
      </h1>
      <p className="text-sm text-ink-70">{t.intro}</p>
      <ol className="flex flex-col gap-3">
        {t.rules.map((rule, index) => (
          <li
            key={index}
            className="flex gap-3 rounded-lg border bg-card p-4 shadow-soft"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-bold">
              {index + 1}
            </span>
            <p className="text-sm">{rule}</p>
          </li>
        ))}
      </ol>
      <p className="text-sm text-ink-70">{t.outro}</p>
    </section>
  );
}
