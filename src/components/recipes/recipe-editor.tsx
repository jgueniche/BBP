"use client";

import { ExternalLink, Link2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  saveRecipe,
  searchFoodsForRecipe,
  type RecipeFoodCandidate,
  type RecipeInput,
} from "@/app/(app)/recettes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fr } from "@/i18n/fr";
import { cn } from "@/lib/utils/cn";

const t = fr.recettes;
const f = t.fields;

const ICON_SUGGESTIONS = [
  "🍲",
  "🥘",
  "🍛",
  "🥗",
  "🍞",
  "🥩",
  "🐟",
  "🍆",
  "🍅",
  "🌶️",
  "🍋",
  "🫒",
  "🥚",
  "🍰",
  "🍪",
  "🍹",
];

type EditorIngredient = {
  label: string;
  grams: string;
  food_id: string | null;
  foodName: string | null;
  section: string;
};

type EditorStep = {
  text: string;
  durationMin: string;
  section: string;
};

export type EditorInitial = {
  id: string | null;
  title: string;
  description: string;
  origin: RecipeInput["origin"];
  category: RecipeInput["category"];
  difficulty: RecipeInput["difficulty"];
  prepMin: string;
  cookMin: string;
  servings: string;
  tags: string;
  visibility: RecipeInput["visibility"];
  versionKind: RecipeInput["versionKind"];
  icon: string;
  sourceUrl: string | null;
  sourceAuthor: string;
  ingredients: EditorIngredient[];
  steps: EditorStep[];
};

export const emptyEditorInitial: EditorInitial = {
  id: null,
  title: "",
  description: "",
  origin: "tunisie",
  category: "plat",
  difficulty: "facile",
  prepMin: "15",
  cookMin: "30",
  servings: "4",
  tags: "",
  visibility: "community",
  versionKind: "boutargue",
  icon: "",
  sourceUrl: null,
  sourceAuthor: "",
  ingredients: [
    { label: "", grams: "", food_id: null, foodName: null, section: "" },
  ],
  steps: [{ text: "", durationMin: "", section: "" }],
};

const selectClass =
  "rounded-[10px] border bg-card px-3 py-2 text-sm font-medium";
const smallInputClass = "rounded-[10px] border bg-card px-2 py-2 text-sm";

export function RecipeEditor({ initial }: { initial: EditorInitial }) {
  const router = useRouter();
  const [state, setState] = useState<EditorInitial>(initial);
  const [pending, setPending] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    index: number;
    items: RecipeFoodCandidate[];
  } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update<K extends keyof EditorInitial>(
    key: K,
    value: EditorInitial[K],
  ) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function updateIngredient(index: number, patch: Partial<EditorIngredient>) {
    setState((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === index ? { ...ing, ...patch } : ing,
      ),
    }));
  }

  function updateStep(index: number, patch: Partial<EditorStep>) {
    setState((prev) => ({
      ...prev,
      steps: prev.steps.map((step, i) =>
        i === index ? { ...step, ...patch } : step,
      ),
    }));
  }

  function onLabelChange(index: number, value: string) {
    updateIngredient(index, { label: value, food_id: null, foodName: null });
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 2) {
      setSuggestions(null);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      const items = await searchFoodsForRecipe(value);
      setSuggestions({ index, items });
    }, 300);
  }

  function pickSuggestion(index: number, candidate: RecipeFoodCandidate) {
    updateIngredient(index, {
      food_id: candidate.food_id,
      foodName: candidate.name,
    });
    setSuggestions(null);
  }

  const knownSections = [
    ...new Set(
      [...state.steps, ...state.ingredients]
        .map((item) => item.section.trim())
        .filter(Boolean),
    ),
  ];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const payload: RecipeInput = {
        id: state.id,
        title: state.title.trim(),
        description: state.description.trim() || null,
        origin: state.origin,
        category: state.category,
        difficulty: state.difficulty,
        prepMin: state.prepMin ? parseInt(state.prepMin, 10) : null,
        cookMin: state.cookMin ? parseInt(state.cookMin, 10) : null,
        servings: parseInt(state.servings, 10) || 4,
        tags: state.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        visibility: state.visibility,
        versionKind: state.versionKind,
        icon: state.icon.trim() || null,
        sourceUrl: state.sourceUrl,
        sourceAuthor: state.sourceAuthor.trim() || null,
        ingredients: state.ingredients
          .filter((ing) => ing.label.trim().length > 0)
          .map((ing) => {
            const grams = parseFloat(ing.grams.replace(",", "."));
            return {
              label: ing.label.trim(),
              qty: Number.isFinite(grams) ? grams : null,
              unit: "g",
              grams: Number.isFinite(grams) ? grams : null,
              food_id: ing.food_id,
              section: ing.section.trim() || null,
            };
          }),
        steps: state.steps
          .filter((step) => step.text.trim().length > 2)
          .map((step) => {
            const duration = parseInt(step.durationMin, 10);
            return {
              text: step.text.trim(),
              durationMin:
                Number.isFinite(duration) && duration > 0 ? duration : null,
              section: step.section.trim() || null,
            };
          }),
      };
      const result = await saveRecipe(payload);
      router.push(`/recettes/${result.slug}`);
    } catch {
      toast(t.saveError);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {state.sourceUrl && (
        <p className="flex flex-wrap items-center gap-1.5 rounded-[10px] border bg-ink-10/50 px-3 py-2 text-xs text-ink-70">
          <span className="font-semibold">{t.importPage.credit} :</span>
          {state.sourceAuthor || "—"}
          <a
            href={state.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium underline underline-offset-2"
          >
            {t.viewOriginal}
            <ExternalLink size={11} strokeWidth={2} aria-hidden />
          </a>
        </p>
      )}

      <div className="flex items-end gap-3">
        <label className="flex w-20 flex-col gap-1.5 text-sm font-medium">
          {f.icon}
          <Input
            value={state.icon}
            onChange={(e) => update("icon", e.target.value)}
            maxLength={4}
            className="text-center text-xl"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">
          {f.title}
          <Input
            value={state.title}
            onChange={(e) => update("title", e.target.value)}
            required
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-1">
        {ICON_SUGGESTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => update("icon", emoji)}
            aria-pressed={state.icon === emoji}
            className={cn(
              "rounded-[10px] border px-1.5 py-0.5 text-lg leading-none",
              state.icon === emoji
                ? "border-ink bg-boutargue-tint"
                : "border-transparent hover:border-ink-30",
            )}
          >
            {emoji}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {f.description}
        <Input
          value={state.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </label>

      <div className="grid grid-cols-2 gap-3 text-sm font-medium sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          {f.origin}
          <select
            value={state.origin ?? "autre"}
            onChange={(e) =>
              update("origin", e.target.value as EditorInitial["origin"])
            }
            className={selectClass}
          >
            {Object.entries(t.origins).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          {f.category}
          <select
            value={state.category ?? "plat"}
            onChange={(e) =>
              update("category", e.target.value as EditorInitial["category"])
            }
            className={selectClass}
          >
            {Object.entries(t.categories).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          {f.difficulty}
          <select
            value={state.difficulty ?? "facile"}
            onChange={(e) =>
              update(
                "difficulty",
                e.target.value as EditorInitial["difficulty"],
              )
            }
            className={selectClass}
          >
            {Object.entries(t.difficulties).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          {f.prep}
          <Input
            inputMode="numeric"
            value={state.prepMin}
            onChange={(e) => update("prepMin", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          {f.cook}
          <Input
            inputMode="numeric"
            value={state.cookMin}
            onChange={(e) => update("cookMin", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          {f.servings}
          <Input
            inputMode="numeric"
            value={state.servings}
            onChange={(e) => update("servings", e.target.value)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {f.tags}
        <Input
          value={state.tags}
          onChange={(e) => update("tags", e.target.value)}
          placeholder="chabbat, express…"
        />
      </label>

      <div className="grid grid-cols-2 gap-3 text-sm font-medium">
        <label className="flex flex-col gap-1.5">
          {f.visibility}
          <select
            value={state.visibility}
            onChange={(e) =>
              update(
                "visibility",
                e.target.value as EditorInitial["visibility"],
              )
            }
            className={selectClass}
          >
            {Object.entries(t.visibilities).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          {f.version}
          <select
            value={state.versionKind}
            onChange={(e) =>
              update(
                "versionKind",
                e.target.value as EditorInitial["versionKind"],
              )
            }
            className={selectClass}
          >
            {Object.entries(t.versions).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-display text-base font-extrabold">
          {t.ingredients}
        </legend>
        {state.ingredients.map((ingredient, index) => (
          <div key={index} className="relative">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  value={ingredient.label}
                  onChange={(e) => onLabelChange(index, e.target.value)}
                  placeholder={f.ingredientLabel}
                />
              </div>
              <input
                inputMode="decimal"
                value={ingredient.grams}
                onChange={(e) =>
                  updateIngredient(index, { grams: e.target.value })
                }
                className="w-16 rounded-[10px] border bg-card px-2 py-2 text-right font-mono text-sm"
                aria-label={`${ingredient.label || f.ingredientLabel} (${f.grams})`}
              />
              <span className="text-xs text-ink-50">{f.grams}</span>
              <input
                value={ingredient.section}
                onChange={(e) =>
                  updateIngredient(index, { section: e.target.value })
                }
                list="recipe-sections"
                placeholder={f.phase}
                className={cn(smallInputClass, "hidden w-28 sm:block")}
                aria-label={`${f.phase} — ${ingredient.label || f.ingredientLabel}`}
              />
              <button
                type="button"
                onClick={() =>
                  update(
                    "ingredients",
                    state.ingredients.filter((_, i) => i !== index),
                  )
                }
                aria-label={t.delete}
                className="rounded-full p-1 text-ink-50 hover:bg-ink-10"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            <p
              className={cn(
                "mt-0.5 flex items-center gap-1 text-[11px]",
                ingredient.food_id ? "text-ok" : "text-ink-30",
              )}
            >
              <Link2 size={11} strokeWidth={2} aria-hidden />
              {ingredient.food_id
                ? `${f.linked} : ${ingredient.foodName}`
                : f.notLinked}
            </p>
            {suggestions?.index === index && suggestions.items.length > 0 && (
              <ul className="absolute left-0 right-24 top-12 z-20 rounded-lg border bg-card shadow-pop">
                {suggestions.items.map((candidate) => (
                  <li key={candidate.food_id}>
                    <button
                      type="button"
                      onClick={() => pickSuggestion(index, candidate)}
                      className="w-full truncate px-3 py-2 text-left text-sm hover:bg-ink-10"
                    >
                      {candidate.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() =>
            update("ingredients", [
              ...state.ingredients,
              {
                label: "",
                grams: "",
                food_id: null,
                foodName: null,
                section: "",
              },
            ])
          }
        >
          <Plus />
          {f.addIngredient}
        </Button>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-display text-base font-extrabold">
          {t.steps}
        </legend>
        <datalist id="recipe-sections">
          {knownSections.map((section) => (
            <option key={section} value={section} />
          ))}
        </datalist>
        {state.steps.map((step, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="mt-2.5 font-mono text-xs font-bold text-ink-50">
              {index + 1}.
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <textarea
                value={step.text}
                onChange={(e) => updateStep(index, { text: e.target.value })}
                placeholder={f.stepPlaceholder}
                rows={2}
                className="rounded-[10px] border bg-card px-3 py-2 text-sm"
              />
              <div className="flex items-center gap-2">
                <input
                  value={step.section}
                  onChange={(e) =>
                    updateStep(index, { section: e.target.value })
                  }
                  list="recipe-sections"
                  placeholder={f.phasePlaceholder}
                  className={cn(smallInputClass, "w-40")}
                  aria-label={`${f.phase} — ${t.steps} ${index + 1}`}
                />
                <input
                  inputMode="numeric"
                  value={step.durationMin}
                  onChange={(e) =>
                    updateStep(index, { durationMin: e.target.value })
                  }
                  placeholder="—"
                  className={cn(smallInputClass, "w-14 text-right font-mono")}
                  aria-label={`${f.stepDuration} — ${t.steps} ${index + 1}`}
                />
                <span className="text-xs text-ink-50">{f.stepDuration}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                update(
                  "steps",
                  state.steps.filter((_, i) => i !== index),
                )
              }
              aria-label={t.delete}
              className="mt-2 rounded-full p-1 text-ink-50 hover:bg-ink-10"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() =>
            update("steps", [
              ...state.steps,
              { text: "", durationMin: "", section: "" },
            ])
          }
        >
          <Plus />
          {f.addStep}
        </Button>
      </fieldset>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? f.saving : f.save}
      </Button>
    </form>
  );
}
