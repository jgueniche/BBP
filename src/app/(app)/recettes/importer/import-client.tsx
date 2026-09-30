"use client";

import {
  BadgeCheck,
  BookOpen,
  Camera,
  ClipboardPaste,
  ExternalLink,
  Info,
  Link2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  importRecipeFromPhoto,
  importRecipeFromText,
  importRecipeFromUrl,
  type ImportDraft,
  type ImportResult,
} from "@/app/(app)/recettes/import-actions";
import { saveOfficialVersion } from "@/app/(app)/recettes/journal-actions";
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
const c = fr.creators.import;

type Gate = Extract<
  ImportResult,
  { ok: false; code: "withdrawn" | "blocked" | "official" | "duplicate" }
>;

function isGate(result: ImportResult): result is Gate {
  return (
    !result.ok &&
    (result.code === "withdrawn" ||
      result.code === "blocked" ||
      result.code === "official" ||
      result.code === "duplicate")
  );
}

/** Already in my book: my copy, not another one. */
function DuplicateCard({
  gate,
  onReset,
}: {
  gate: Extract<Gate, { code: "duplicate" }>;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-menthe p-4">
      <p className="flex items-start gap-2 text-sm text-ink">
        <BookOpen
          size={18}
          strokeWidth={2}
          className="mt-0.5 shrink-0"
          aria-hidden
        />
        {(gate.recipe.saved ? t.duplicateSaved : t.duplicate).replace(
          "{title}",
          gate.recipe.title,
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={`/recettes/${gate.recipe.slug}`}>{t.openMyCopy}</Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={onReset}>
          {t.again}
        </Button>
      </div>
    </div>
  );
}

/** The creator's wish, shown instead of the editor. */
function GateCard({
  gate,
  onReset,
}: {
  gate: Exclude<Gate, { code: "duplicate" }>;
  onReset: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const who = gate.creator ?? fr.recettes.theCreator;
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-lilas p-4">
      <p className="flex items-start gap-2 text-sm text-ink">
        {gate.code === "official" ? (
          <BadgeCheck
            size={18}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
            aria-hidden
          />
        ) : (
          <Info
            size={18}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
            aria-hidden
          />
        )}
        {(gate.code === "official"
          ? c.official
          : gate.code === "withdrawn"
            ? c.withdrawn
            : c.blocked
        ).replace("{creator}", who)}
      </p>
      <div className="flex flex-wrap gap-2">
        {gate.code === "official" ? (
          <>
            <Button
              size="sm"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                const result = await saveOfficialVersion(gate.recipe.slug);
                setPending(false);
                if (!result.ok) {
                  toast(fr.recettes.saveError);
                  return;
                }
                toast(c.officialSaved);
                router.push(`/recettes/${result.slug}`);
              }}
            >
              {c.saveOfficial}
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/recettes/${gate.recipe.slug}`}>
                {fr.creators.credit.officialCta}
              </Link>
            </Button>
          </>
        ) : (
          <Button asChild size="sm">
            <a href={gate.originalUrl} target="_blank" rel="noopener">
              {fr.creators.credit.viewOriginal}
              <ExternalLink />
            </a>
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onReset}>
          {t.again}
        </Button>
      </div>
    </div>
  );
}

function draftToInitial(draft: ImportDraft): EditorInitial {
  return {
    ...emptyEditorInitial,
    title: draft.title,
    description: draft.description ?? "",
    origin: draft.cuisine ?? "autre",
    category: draft.category ?? emptyEditorInitial.category,
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
  not_a_post: t.notAPost,
  fetch_failed: t.fetchFailed,
  not_found: t.notFound,
  no_recipe: t.noRecipe,
  needs_ai: t.needsAi,
  need_site_link: t.needSiteLink,
} as const;

export function ImportClient({
  shared = null,
  initialCredit = "",
}: {
  shared?: SharedImport | null;
  /** The creator's @, when she publishes her own version. */
  initialCredit?: string;
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
  const [gate, setGate] = useState<Gate | null>(null);
  const [links, setLinks] = useState<string[]>([]);
  const [creatorHandle, setCreatorHandle] = useState(initialCredit);

  async function runUrlImport(value: string) {
    setPending(true);
    try {
      const result = await importRecipeFromUrl(value);
      if (result.ok) {
        if (result.via === "pinterest") toast(t.viaPinterest);
        setInitial(draftToInitial(result.draft));
        return;
      }
      if (isGate(result)) {
        setGate(result);
        return;
      }
      if (result.code === "need_caption") {
        setSource({
          url: result.sourceUrl ?? value,
          author: result.sourceAuthor,
          title: result.title,
        });
        setLinks(result.links);
        const credit = result.sourceAuthor;
        setCreatorHandle((typed) => (credit?.startsWith("@") ? credit : typed));
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
  // the person can trim it before the importer reads it.
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
      const typed = creatorHandle.trim();
      const result = await importRecipeFromText({
        text,
        sourceUrl: source.url,
        sourceAuthor: typed.length > 0 ? typed : source.author,
        title: source.title,
      });
      if (result.ok) {
        setInitial(draftToInitial(result.draft));
        return;
      }
      if (isGate(result)) {
        setGate(result);
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
      toast(result.code === "needs_ai" ? t.needsAi : t.noRecipe);
    } catch {
      toast(t.noRecipe);
    } finally {
      setPending(false);
    }
  }

  if (gate) {
    const reset = () => {
      setGate(null);
      setMode("url");
      setNeedCaption(false);
      setLinks([]);
      setSource({ url: null, author: null, title: null });
    };
    return gate.code === "duplicate" ? (
      <DuplicateCard gate={gate} onReset={reset} />
    ) : (
      <GateCard gate={gate} onReset={reset} />
    );
  }

  if (initial) {
    return (
      <div className="flex flex-col gap-3">
        <p className="flex items-start gap-2 rounded-lg bg-peche px-3 py-2 text-sm text-ink-70">
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
            <p className="rounded-lg bg-ciel px-3 py-2 text-xs text-ink-70">
              {t.needCaption}
            </p>
          )}
          {links.length > 0 && (
            <div className="flex flex-col gap-1 rounded-lg bg-menthe px-3 py-2 text-xs text-ink-70">
              {t.recipeLinks}
              {links.map((link) => (
                <Button
                  key={link}
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="self-start"
                  disabled={pending}
                  onClick={() => {
                    setLinks([]);
                    setNeedCaption(false);
                    setMode("url");
                    setUrl(link);
                    void runUrlImport(link);
                  }}
                >
                  {t.importLink} ·{" "}
                  {new URL(link).hostname.replace(/^www\./, "")}
                </Button>
              ))}
            </div>
          )}
          {source.url && (
            <label className="flex flex-col gap-1 text-sm font-semibold">
              {c.creatorField}
              <Input
                value={creatorHandle}
                onChange={(e) => setCreatorHandle(e.target.value)}
                placeholder="@"
                maxLength={60}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <span className="text-[11px] font-normal text-ink-50">
                {c.creatorHint}
              </span>
            </label>
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
