"use client";

import {
  Camera,
  ClipboardPaste,
  Link2,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  continueImport,
  dismissImportJob,
  getImportJob,
  importQuota,
  listImportJobs,
  startImport,
  type ImportQuota,
  type StartResult,
} from "@/app/(app)/recettes/import-actions";
import {
  RecipeEditor,
  emptyEditorInitial,
  type EditorInitial,
} from "@/components/recipes/recipe-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fr } from "@/i18n/fr";
import { uploadCaptures } from "@/lib/import/capture-upload";
import { MAX_CAPTURES } from "@/lib/import/captures";
import type { FailCode, ImportJobView, JobStop } from "@/lib/import/jobs";
import type { ImportDraft } from "@/lib/import/pipeline";
import type { SharedImport } from "@/lib/pwa/share-target";
import { cn } from "@/lib/utils/cn";

import { ImportList, StopCard } from "./import-cards";

const t = fr.recettes.importPage;
const c = fr.creators.import;

type Mode = "url" | "text" | "captures";

const FAILURES: Record<FailCode, string> = {
  invalid_url: t.invalidUrl,
  not_a_post: t.notAPost,
  fetch_failed: t.fetchFailed,
  not_found: t.notFound,
  no_recipe: t.noRecipe,
  needs_ai: t.needsAi,
  timeout: t.timeout,
};

const START_ERRORS: Record<
  Exclude<StartResult, { ok: true } | { code: "stop" }>["code"],
  string
> = {
  invalid_url: t.invalidUrl,
  invalid: t.invalid,
  needs_ai: t.needsAi,
  quota_daily: t.quotaDaily,
  quota_captures: t.quotaCaptures,
  busy: t.busy,
};

function draftToInitial(draft: ImportDraft, jobId: string): EditorInitial {
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
    importJobId: jobId,
    reformulated: draft.reformulated,
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

/** Up to six captures, previewed, before they are sent. */
function CapturePicker({
  files,
  onChange,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled: boolean;
}) {
  const previews = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );
  useEffect(
    () => () => previews.forEach((url) => URL.revokeObjectURL(url)),
    [previews],
  );
  return (
    <div className="flex flex-col gap-2">
      {files.length < MAX_CAPTURES && (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-ink-30/70 p-6 text-sm font-medium text-ink-70">
          <Camera size={26} strokeWidth={2} aria-hidden />
          {t.capturesPick}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            disabled={disabled}
            onChange={(event) => {
              const picked = Array.from(event.target.files ?? []);
              onChange([...files, ...picked].slice(0, MAX_CAPTURES));
              event.target.value = "";
            }}
          />
        </label>
      )}
      {files.length > 0 && (
        <>
          <p className="text-xs text-ink-50">
            {t.capturesCount.replace("{n}", `${files.length}`)}
          </p>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview, never uploaded as is */}
                <img
                  src={previews[index]}
                  alt=""
                  className="aspect-[9/16] w-full rounded-md border object-cover"
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 rounded-full bg-card p-0.5 shadow-soft"
                  aria-label={`${t.capturesRemove} ${index + 1}`}
                  disabled={disabled}
                  onClick={() => onChange(files.filter((_, i) => i !== index))}
                >
                  <X size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function CreditFields({
  credit,
  onCredit,
  sourceUrl,
  onSourceUrl,
}: {
  credit: string;
  onCredit: (value: string) => void;
  sourceUrl?: string;
  onSourceUrl?: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {onSourceUrl && (
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t.capturesSourceUrl}
          <Input
            type="url"
            value={sourceUrl ?? ""}
            onChange={(event) => onSourceUrl(event.target.value)}
            placeholder="https://www.instagram.com/p/…"
          />
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm font-semibold">
        {c.creatorField}
        <Input
          value={credit}
          onChange={(event) => onCredit(event.target.value)}
          placeholder="@"
          maxLength={60}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <span className="text-[11px] font-normal text-ink-50">
          {onSourceUrl ? t.capturesSourceHint : c.creatorHint}
        </span>
      </label>
    </div>
  );
}

export function ImportClient({
  shared = null,
  initialCredit = "",
  aiEnabled,
  jobs: initialJobs,
  quota: initialQuota,
}: {
  shared?: SharedImport | null;
  /** The creator's @, when she publishes her own version. */
  initialCredit?: string;
  aiEnabled: boolean;
  jobs: ImportJobView[];
  quota: ImportQuota | null;
}) {
  const [mode, setMode] = useState<Mode>(
    shared?.mode === "text" ? "text" : "url",
  );
  const [url, setUrl] = useState(shared?.mode === "url" ? shared.url : "");
  const [text, setText] = useState(shared?.mode === "text" ? shared.text : "");
  const [files, setFiles] = useState<File[]>([]);
  const [captureSource, setCaptureSource] = useState("");
  const [credit, setCredit] = useState(initialCredit);
  const [answer, setAnswer] = useState("");
  const [answerFiles, setAnswerFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<ImportJobView | null>(null);
  const [stop, setStop] = useState<JobStop | null>(null);
  const [editor, setEditor] = useState<EditorInitial | null>(null);
  const [jobs, setJobs] = useState(initialJobs);
  const [quota, setQuota] = useState(initialQuota);
  const [waited, setWaited] = useState<0 | 1 | 2>(0);
  const sharedHandled = useRef(false);

  function reset() {
    setJob(null);
    setStop(null);
    setEditor(null);
    setAnswer("");
    setAnswerFiles([]);
    setWaited(0);
    setMode("url");
  }

  async function refresh() {
    const [nextJobs, nextQuota] = await Promise.all([
      listImportJobs().catch(() => null),
      importQuota().catch(() => null),
    ]);
    if (nextJobs) setJobs(nextJobs);
    if (nextQuota) setQuota(nextQuota);
  }

  function open(view: ImportJobView) {
    setStop(null);
    setWaited(0);
    setJob(view);
    if (view.state.status === "ready") {
      if (view.state.via === "pinterest") toast(t.viaPinterest);
      setEditor(draftToInitial(view.state.draft, view.id));
    }
    if (view.state.status === "needs_input") {
      const author = view.state.sourceAuthor;
      if (author?.startsWith("@")) setCredit(author);
    }
  }

  function follow(result: StartResult, kind: ImportJobView["kind"]) {
    if (result.ok) {
      setEditor(null);
      setStop(null);
      setWaited(0);
      setJob({
        id: result.jobId,
        kind,
        createdAt: new Date().toISOString(),
        sourceUrl: null,
        state: { status: "pending" },
      });
      return;
    }
    if (result.code === "stop") {
      setStop(result.stop);
      return;
    }
    toast(START_ERRORS[result.code]);
    void refresh();
  }

  async function run(
    action: () => Promise<StartResult>,
    kind: ImportJobView["kind"],
  ) {
    setBusy(true);
    try {
      follow(await action(), kind);
    } catch {
      toast(t.fetchFailed);
    } finally {
      setBusy(false);
    }
  }

  function importUrl(value: string) {
    return run(
      () =>
        startImport({ kind: "url", url: value, credit: credit.trim() || null }),
      "url",
    );
  }

  // Follow the job until it has an answer (the server starts it again if
  // its runner vanished); after 3 minutes it goes on in « Mes imports ».
  const followedId = job?.state.status === "pending" ? job.id : null;
  useEffect(() => {
    if (!followedId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    const started = Date.now();
    const tick = async () => {
      polls += 1;
      const next = await getImportJob(followedId).catch(() => null);
      if (cancelled) return;
      if (next && next.state.status !== "pending") {
        open(next);
        void refresh();
        return;
      }
      const elapsed = Date.now() - started;
      setWaited(elapsed > 180_000 ? 2 : elapsed > 20_000 ? 1 : 0);
      if (elapsed > 180_000) return;
      timer = setTimeout(tick, polls < 8 ? 1_000 : 2_500);
    };
    timer = setTimeout(tick, 600);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [followedId]);

  // A link shared to the app (Android) is imported right away; shared text
  // is only prefilled so it can be trimmed first.
  useEffect(() => {
    if (!shared || shared.mode !== "url" || sharedHandled.current) return;
    sharedHandled.current = true;
    toast(fr.pwa.share.received);
    void importUrl(shared.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shared]);

  async function submitCaptures(
    list: File[],
    send: (paths: string[]) => Promise<StartResult>,
    kind: ImportJobView["kind"],
  ) {
    setBusy(true);
    try {
      const paths = await uploadCaptures(list);
      follow(await send(paths), kind);
    } catch {
      toast(t.fetchFailed);
    } finally {
      setBusy(false);
    }
  }

  if (editor) {
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
        <RecipeEditor initial={editor} />
      </div>
    );
  }

  if (stop) return <StopCard stop={stop} onReset={reset} />;

  if (job?.state.status === "answered") {
    return <StopCard stop={job.state.stop} onReset={reset} />;
  }

  if (job?.state.status === "pending") {
    return (
      <div
        className="flex flex-col gap-3 rounded-lg border bg-card p-4"
        aria-live="polite"
      >
        <p className="flex items-center gap-2 text-sm font-medium">
          <Loader2
            size={16}
            className="animate-spin motion-reduce:animate-none"
            aria-hidden
          />
          {t.analyzing}
        </p>
        {waited > 0 && (
          <p className="text-xs text-ink-50">
            {waited === 2 ? t.pendingTooLong : t.pendingLong}
          </p>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          onClick={reset}
        >
          {t.again}
        </Button>
      </div>
    );
  }

  if (job?.state.status === "failed") {
    return (
      <div className="flex flex-col gap-3 rounded-lg bg-rose p-4" role="status">
        <p className="text-sm text-ink">{FAILURES[job.state.code]}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              reset();
              setMode("text");
            }}
          >
            {t.textTab}
          </Button>
          <Button size="sm" variant="ghost" onClick={reset}>
            {t.again}
          </Button>
        </div>
      </div>
    );
  }

  if (job?.state.status === "needs_input") {
    const question = job.state;
    const jobId = job.id;
    if (question.ask === "site_link") {
      return (
        <form
          className="flex flex-col gap-3 rounded-lg bg-ciel p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void dismissImportJob(jobId);
            void importUrl(url);
          }}
        >
          <p className="text-sm text-ink">{t.needSiteLink}</p>
          <Input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={t.urlPlaceholder}
            required
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? t.analyzing : t.submit}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              {t.again}
            </Button>
          </div>
        </form>
      );
    }
    const askCredit =
      question.platform === "instagram" ||
      !question.sourceAuthor?.startsWith("@");
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-lg bg-ciel px-3 py-2 text-xs text-ink-70">
          {question.platform === "instagram"
            ? t.needCaptionInstagram
            : t.needCaption}
        </p>
        {question.links.length > 0 && (
          <div className="flex flex-col gap-1 rounded-lg bg-menthe px-3 py-2 text-xs text-ink-70">
            {t.recipeLinks}
            {question.links.map((link) => (
              <Button
                key={link}
                type="button"
                size="sm"
                variant="secondary"
                className="self-start"
                disabled={busy}
                onClick={() => {
                  void dismissImportJob(jobId);
                  void importUrl(link);
                }}
              >
                {t.importLink} · {new URL(link).hostname.replace(/^www\./, "")}
              </Button>
            ))}
          </div>
        )}
        {askCredit && <CreditFields credit={credit} onCredit={setCredit} />}
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              () =>
                continueImport(jobId, {
                  kind: "text",
                  text: answer,
                  credit: credit.trim() || null,
                }),
              "text",
            );
          }}
        >
          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder={t.textPlaceholder}
            aria-label={t.textTab}
            rows={8}
            minLength={20}
            className="rounded-[10px] border bg-card px-3 py-2 text-sm"
          />
          <Button
            type="submit"
            className="self-start"
            disabled={busy || answer.trim().length < 20}
          >
            {busy ? t.analyzing : t.answer}
          </Button>
        </form>
        {aiEnabled && (
          <div className="flex flex-col gap-2">
            <CapturePicker
              files={answerFiles}
              onChange={setAnswerFiles}
              disabled={busy}
            />
            {answerFiles.length > 0 && (
              <Button
                className="self-start"
                disabled={busy}
                onClick={() =>
                  void submitCaptures(
                    answerFiles,
                    (paths) =>
                      continueImport(jobId, {
                        kind: "captures",
                        paths,
                        note: null,
                        credit: credit.trim() || null,
                      }),
                    "captures",
                  )
                }
              >
                {busy ? t.uploading : t.answer}
              </Button>
            )}
          </div>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          onClick={reset}
        >
          {t.again}
        </Button>
      </div>
    );
  }

  const exhausted = quota !== null && quota.left === 0;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex gap-1 rounded-full border bg-card p-1 text-sm font-bold">
          {(
            [
              ["url", t.urlTab, Link2],
              ["text", t.textTab, ClipboardPaste],
              ["captures", t.capturesTab, Camera],
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

        {quota !== null && quota.left <= 3 && (
          <p
            className="rounded-lg bg-beurre px-3 py-2 text-xs text-ink-70"
            role="status"
          >
            {exhausted
              ? t.quotaDaily
              : t.quotaLeft.replace("{n}", `${quota.left}`)}
          </p>
        )}

        {mode === "url" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void importUrl(url);
            }}
            className="flex flex-col gap-2"
          >
            <Input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={t.urlPlaceholder}
              aria-label={t.urlTab}
              required
            />
            <Button
              type="submit"
              disabled={busy || exhausted}
              className="self-start"
            >
              {busy ? t.analyzing : t.submit}
            </Button>
          </form>
        )}

        {mode === "text" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(
                () =>
                  startImport({
                    kind: "text",
                    text,
                    title: null,
                    sourceUrl: null,
                    credit: null,
                  }),
                "text",
              );
            }}
            className="flex flex-col gap-2"
          >
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t.textPlaceholder}
              aria-label={t.textTab}
              rows={10}
              minLength={20}
              required
              className="rounded-[10px] border bg-card px-3 py-2 text-sm"
            />
            <Button
              type="submit"
              disabled={busy || exhausted || text.trim().length < 20}
              className="self-start"
            >
              {busy ? t.analyzing : t.submit}
            </Button>
          </form>
        )}

        {mode === "captures" &&
          (aiEnabled ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-ink-70">{t.capturesIntro}</p>
              <CapturePicker
                files={files}
                onChange={setFiles}
                disabled={busy}
              />
              <CreditFields
                credit={credit}
                onCredit={setCredit}
                sourceUrl={captureSource}
                onSourceUrl={setCaptureSource}
              />
              <Button
                className="self-start"
                disabled={busy || exhausted || files.length === 0}
                onClick={() =>
                  void submitCaptures(
                    files,
                    (paths) =>
                      startImport({
                        kind: "captures",
                        paths,
                        note: null,
                        sourceUrl: captureSource.trim() || null,
                        credit: credit.trim() || null,
                      }),
                    "captures",
                  )
                }
              >
                {busy ? t.uploading : t.submit}
              </Button>
            </div>
          ) : (
            <p className="rounded-lg bg-ciel px-3 py-2 text-sm text-ink-70">
              {t.capturesNeedAi}
            </p>
          ))}
      </div>

      <ImportList
        jobs={jobs}
        onResume={(view) => {
          if (view.state.status === "pending") {
            setJob(view);
            return;
          }
          open(view);
        }}
        onDismiss={async (view) => {
          setJobs((list) => list.filter((item) => item.id !== view.id));
          await dismissImportJob(view.id);
        }}
      />
    </div>
  );
}
