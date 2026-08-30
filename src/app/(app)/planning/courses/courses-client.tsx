"use client";

import { RefreshCw, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  generateShoppingList,
  toggleShoppingItem,
} from "@/app/(app)/planning/actions";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import { cn } from "@/lib/utils/cn";

const t = fr.planning.courses;

export type CoursesItem = {
  id: string;
  label: string;
  grams: number | null;
  aisle: string;
  kosherNote: boolean;
  checked: boolean;
};

export function CoursesClient({
  weekStart,
  shareToken,
  initialItems,
}: {
  weekStart: string;
  shareToken: string | null;
  initialItems: CoursesItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);

  const byAisle = new Map<string, CoursesItem[]>();
  for (const item of items) {
    const list = byAisle.get(item.aisle) ?? [];
    list.push(item);
    byAisle.set(item.aisle, list);
  }

  async function onGenerate() {
    setBusy(true);
    try {
      const result = await generateShoppingList(weekStart);
      toast(t.generated);
      if (result.count >= 0) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    if (!shareToken) return;
    const url = `${window.location.origin}/courses/${shareToken}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: t.title, url });
        return;
      }
    } catch {
      // Share sheet dismissed — fall back to the clipboard.
    }
    await navigator.clipboard.writeText(url);
    toast(t.shareCopied);
  }

  async function onToggle(item: CoursesItem) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)),
    );
    try {
      await toggleShoppingItem(item.id, !item.checked);
    } catch {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, checked: item.checked } : i,
        ),
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={onGenerate} disabled={busy} size="sm">
          <RefreshCw />
          {items.length > 0 ? t.regenerate : t.generate}
        </Button>
        {items.length > 0 && shareToken && (
          <Button variant="secondary" size="sm" onClick={onShare}>
            <Share2 />
            {t.share}
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink-70">{t.empty}</p>
      ) : (
        [...byAisle.entries()].map(([aisle, aisleItems]) => (
          <section key={aisle}>
            <h2 className="font-display text-base font-extrabold">{aisle}</h2>
            <ul className="mt-1.5 flex flex-col gap-1">
              {aisleItems.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-[14px] border-2 border-ink-10 bg-paper px-3 py-2">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => onToggle(item)}
                      className="size-4 accent-ink"
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 text-sm",
                        item.checked && "text-ink-30 line-through",
                      )}
                    >
                      {item.label}
                    </span>
                    {item.kosherNote && (
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
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
