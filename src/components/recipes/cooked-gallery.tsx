import { fr } from "@/i18n/fr";
import type { CookedEntry } from "@/lib/recipes/social";

const t = fr.recettes.cooked;

/** « Cuisinée N fois » and the members' versions, photos first. */
export function CookedGallery({
  count,
  entries,
}: {
  count: number;
  entries: CookedEntry[];
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-semibold">
        {count === 1 ? t.countOne : t.count.replace("{n}", String(count))}
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-ink-50">{t.galleryEmpty}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-1 rounded-lg border bg-card p-1.5"
            >
              {entry.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.photo}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full rounded-[10px] object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-[10px] bg-rose p-2 text-center text-xs text-ink-70">
                  {entry.text}
                </div>
              )}
              <p className="truncate px-0.5 text-[11px] text-ink-50">
                {t.byLine} {entry.authorName ?? fr.recettes.authorHidden}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
