"use client";

import { Camera, ClipboardPaste, Link2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  importRecipeFromPhoto,
  importRecipeFromText,
  importRecipeFromUrl,
  type ImportDraft,
} from "@/app/(app)/recettes/import-actions";
import {
  RecipeEditor,
  emptyEditorInitial,
  type EditorInitial,
} from "@/components/recipes/recipe-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fr } from "@/i18n/fr";
import type { SharedImport } from "@/lib/pwa/share-target";
import { cn } from "@/lib/utils/cn";

const t = fr.recettes.importPage;

function draftToInitial(draft: ImportDraft): EditorInitial {
  return {
    ...emptyEditorInitial,
    title: draft.title,
    description: draft.description ?? "",
    origin: "autre",
    prepMin: draft.prepMin === null ? "" : `${draft.prepMin}`,
    cookMin: draft.cookMin === null ? "" : `${draft.cookMin}`,
    servings: draft.servings === null ? "4" : `${draft.servings}`,
    tags: draft.tags.join(", "),
    visibility: "private",
    icon: draft.icon ?? "",
    sourceUrl: draft.sourceUrl,
    sourceAuthor: draft.sourceAuthor ?? "",
    ingredients:
      draft.ingredients.length > 0
        ? draft.ingredients.map((ingredient) => ({
            label: ingredient.label,
            grams: ingredient.grams === null ? "" : `${ingredient.grams}`,
            food_id: null,
            foodName: null,
            section: ingredient.section ?? "",
          }))
        : emptyEditorInitial.ingredients,
    steps:
      draft.steps.length > 0
        ? draft.steps.map((step) => ({
            text: step.text,
            durationMin: step.durationMin === null ? "" : `${step.durationMin}`,
            section: step.section ?? "",
          }))
        : emptyEditorInitial.steps,
  };
}

const ERROR_MESSAGES = {
  invalid_url: t.invalidUrl,
  fetch_failed: t.fetchFailed,
  no_recipe: t.noRecipe,
} as const;

export function ImportClient({
  shared = null,
}: {
  shared?: SharedImport | null;
}) {
  const [mode, setMode] = useState<"url" | "text" | "photo">(
    shared?.mode ?? "url",
  );
  const [url, setUrl] = useState(shared?.mode === "url" ? shared.url : "");
  const [text, setText] = useState(shared?.mode === "text" ? shared.text : "");
  const sharedHandled = useRef(false);
  const [pending, setPending] = useState(false);
  const [needCaption, setNeedCaption] = useState(false);
  const [source, setSource] = useState<{
    url: string | null;
    author: string | null;
    title: string | null;
  }>({ url: null, author: null, title: null });
  const [initial, setInitial] = useState<EditorInitial | null>(null);

  async function runUrlImport(value: string) {
    setPending(true);
    try {
      const result = await importRecipeFromUrl(value);
      if (result.ok) {
        setInitial(draftToInitial(result.draft));
        return;
      }
      if (result.code === "need_caption") {
        setSource({
          url: value,
          author: result.sourceAuthor ?? null,
          title: result.title ?? null,
        });
        setNeedCaption(true);
        setMode("text");
        return;
      }
      toast(ERROR_MESSAGES[result.code]);
    } catch {
      toast(t.fetchFailed);
    } finally {
      setPending(false);
    }
  }

  async function submitUrl(event: React.FormEvent) {
    event.preventDefault();
    await runUrlImport(url);
  }

  // A shared link is analysed right away; shared text is only prefilled so
  // the person can trim it before Kémia reads it.
  useEffect(() => {
    if (!shared || shared.mode !== "url" || sharedHandled.current) return;
    sharedHandled.current = true;
    toast(fr.pwa.share.received);
    void runUrlImport(shared.url);
  }, [shared]);

  async function submitText(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await importRecipeFromText({
        text,
        sourceUrl: source.url,
        sourceAuthor: source.author,
        title: source.title,
      });
      if (result.ok) {
        setInitial(draftToInitial(result.draft));
        return;
      }
      toast(t.noRecipe);
    } catch {
      toast(t.noRecipe);
    } finally {
      setPending(false);
    }
  }

  async function submitPhoto(file: File) {
    setPending(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      const [, base64] = dataUrl.split(",", 2);
      const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp";
      const result = await importRecipeFromPhoto({
        imageBase64: base64,
        mediaType: ["image/jpeg", "image/png", "image/webp"].includes(mediaType)
          ? mediaType
          : "image/jpeg",
      });
      if (result.ok) {
        setInitial(draftToInitial(result.draft));
        return;
      }
      toast(t.noRecipe);
    } catch {
      toast(t.noRecipe);
    } finally {
      setPending(false);
    }
  }

  if (initial) {
    return (
      <div className="flex flex-col gap-3">
        <p className="flex items-start gap-2 rounded-lg border bg-boutargue-tint px-3 py-2 text-sm text-[#3d3d3d]">
          <Sparkles
            size={16}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
            aria-hidden
          />
          {t.review}
        </p>
        <RecipeEditor initial={initial} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-full border bg-card p-1 text-sm font-bold">
        {(
          [
            ["url", t.urlTab, Link2],
            ["text", t.textTab, ClipboardPaste],
            ["photo", t.photoTab, Camera],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            aria-pressed={mode === key}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5",
              mode === key ? "bg-ink text-paper" : "text-ink-70",
            )}
          >
            <Icon size={14} strokeWidth={2} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {mode === "url" && (
        <form onSubmit={submitUrl} className="flex flex-col gap-2">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t.urlPlaceholder}
            required
          />
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? t.analyzing : t.submit}
          </Button>
        </form>
      )}

      {mode === "text" && (
        <form onSubmit={submitText} className="flex flex-col gap-2">
          {needCaption && (
            <p className="rounded-lg border bg-ink-10/50 px-3 py-2 text-xs text-ink-70">
              {t.needCaption}
            </p>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.textPlaceholder}
            rows={10}
            minLength={20}
            required
            className="rounded-[10px] border bg-card px-3 py-2 text-sm"
          />
          <Button
            type="submit"
            disabled={pending || text.trim().length < 20}
            className="self-start"
          >
            {pending ? t.analyzing : t.submit}
          </Button>
        </form>
      )}

      {mode === "photo" && (
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-ink-30/70 p-8 text-sm font-medium text-ink-70">
            <Camera size={28} strokeWidth={2} aria-hidden />
            {pending ? t.analyzing : t.photoCta}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={pending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void submitPhoto(file);
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
