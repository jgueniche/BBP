import { fr } from "@/i18n/fr";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const t = fr.planning.courses;

type SharedList = {
  week_start: string;
  items: Array<{
    label: string;
    grams: number | null;
    aisle: string;
    kosher_note: boolean;
    checked: boolean;
  }>;
};

export default async function SharedCoursesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let list: SharedList | null = null;
  if (
    isSupabaseConfigured &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      token,
    )
  ) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("shopping_list_by_token", { token });
    if (data && typeof data === "object" && "items" in data) {
      list = data as SharedList;
    }
  }

  if (!list) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="font-display text-2xl font-extrabold">
          {t.publicTitle}
        </h1>
        <p className="mt-3 text-sm text-ink-70">{t.publicEmpty}</p>
      </main>
    );
  }

  const weekLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${list.week_start}T00:00:00Z`));

  const byAisle = new Map<string, SharedList["items"]>();
  for (const item of list.items) {
    const bucket = byAisle.get(item.aisle) ?? [];
    bucket.push(item);
    byAisle.set(item.aisle, bucket);
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-8">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {t.publicTitle} — BBP
        </h1>
        <p className="text-xs text-ink-50">
          {fr.planning.weekOf} {weekLabel} · {list.items.length} {t.itemsLabel}
        </p>
      </header>
      {[...byAisle.entries()].map(([aisle, items]) => (
        <section key={aisle}>
          <h2 className="font-display text-base font-extrabold">{aisle}</h2>
          <ul className="mt-1.5 flex flex-col gap-1">
            {items.map((item, index) => (
              <li
                key={index}
                className="flex items-center gap-2 rounded-[14px] border-2 border-ink-10 bg-paper px-3 py-2 text-sm"
              >
                <span
                  className={
                    item.checked
                      ? "min-w-0 flex-1 text-ink-30 line-through"
                      : "min-w-0 flex-1"
                  }
                >
                  {item.label}
                </span>
                {item.kosher_note && (
                  <span className="rounded-full bg-boutargue-soft px-1.5 py-0.5 text-[10px] font-semibold text-[#3d3d3d]">
                    {t.kosherNote}
                  </span>
                )}
                {item.grams !== null && (
                  <span className="shrink-0 font-mono text-xs text-ink-50">
                    {item.grams >= 1000
                      ? `${(item.grams / 1000).toFixed(1).replace(".", ",")} kg`
                      : `${item.grams} g`}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
