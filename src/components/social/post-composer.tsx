"use client";

import { Link2, Send, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { createPost } from "@/app/(app)/communaute/actions";
import { searchPlannerRecipes } from "@/app/(app)/planning/actions";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import { cn } from "@/lib/utils/cn";

const t = fr.communaute.composer;

type Attached = { id: string; title: string; icon: string | null };

const KINDS = ["text", "shabbat_plate", "progress", "workout"] as const;

export function PostComposer({ groupId }: { groupId?: string | null }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("text");
  const [recipe, setRecipe] = useState<Attached | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Attached[]>([]);
  const [pending, setPending] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFriday = new Date().getDay() === 5;

  function onQuery(value: string) {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 2) {
      setCandidates([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      const results = await searchPlannerRecipes(value);
      setCandidates(
        results.map((r) => ({ id: r.id, title: r.title, icon: r.icon })),
      );
    }, 300);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await createPost({
        text: text.trim(),
        kind: recipe ? "recipe" : kind,
        recipeId: recipe?.id ?? null,
        groupId: groupId ?? null,
      });
      if (!result.ok) {
        toast(
          result.code === "moderation"
            ? `${t.blockedPrefix} (${result.reasons.join(", ")}).`
            : fr.recettes.saveError,
        );
        return;
      }
      toast(t.published);
      setText("");
      setRecipe(null);
      setKind("text");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-soft"
    >
      {isFriday && !groupId && (
        <p className="text-xs font-semibold text-boutargue-deep">
          {t.shabbatHint}
        </p>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.placeholder}
        rows={2}
        maxLength={1000}
        className="rounded-[10px] border bg-card px-3 py-2 text-sm"
      />

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {KINDS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            aria-pressed={kind === value}
            className={cn(
              "rounded-full border px-2 py-0.5 font-semibold",
              kind === value && !recipe
                ? "border-ink bg-boutargue-tint"
                : "bg-card text-ink-70",
            )}
          >
            {t.kinds[value]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSearchOpen((open) => !open)}
          className={cn(
            "flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold",
            recipe
              ? "border-ink bg-boutargue-tint"
              : "bg-card text-ink-70",
          )}
        >
          <Link2 size={12} strokeWidth={2} aria-hidden />
          {t.attachRecipe}
        </button>
      </div>

      {recipe && (
        <p className="flex items-center gap-2 rounded-[10px] border px-3 py-1.5 text-sm font-semibold">
          {recipe.icon && (
            <span className="text-lg leading-none" aria-hidden>
              {recipe.icon}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate">{recipe.title}</span>
          <button
            type="button"
            onClick={() => setRecipe(null)}
            aria-label={t.detach}
            className="rounded-full p-0.5 text-ink-50 hover:bg-ink-10"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </p>
      )}

      {searchOpen && !recipe && (
        <div className="flex flex-col gap-1.5">
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t.searchRecipe}
            className="rounded-[10px] border bg-card px-2.5 py-1.5 text-sm"
          />
          {candidates.length > 0 && (
            <ul className="flex flex-col gap-1">
              {candidates.map((candidate) => (
                <li key={candidate.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setRecipe(candidate);
                      setSearchOpen(false);
                      setQuery("");
                      setCandidates([]);
                    }}
                    className="flex w-full items-center gap-2 rounded-[10px] border px-2.5 py-1.5 text-left text-sm hover:border-ink"
                  >
                    {candidate.icon && (
                      <span aria-hidden>{candidate.icon}</span>
                    )}
                    <span className="truncate">{candidate.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Link
          href="/communaute/charte"
          className="text-[11px] text-ink-50 underline underline-offset-2"
        >
          {t.charterLink}
        </Link>
        <span className="flex-1 text-right text-[11px] text-ink-30">
          {t.nameNotice}
        </span>
        <Button
          type="submit"
          size="sm"
          disabled={pending || text.trim().length < 2}
        >
          <Send />
          {pending ? t.publishing : t.publish}
        </Button>
      </div>
    </form>
  );
}
