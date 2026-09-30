import { z } from "zod";

import { CATEGORIES, CUISINES } from "@/lib/recipes/cuisines";

import type { ImportDraft, ImportOutcome, NeedsInput } from "./pipeline";

// An import job as the member sees it: waiting, a draft to check, a
// question, a stop (the creator's wish, her own copy), a failure. The job's
// result is JSON written by the runner; it is read back through these
// schemas, never trusted as is.

export const FAIL_CODES = [
  "invalid_url",
  "not_a_post",
  "fetch_failed",
  "not_found",
  "no_recipe",
  "needs_ai",
  "timeout",
] as const;
export type FailCode = (typeof FAIL_CODES)[number];

const draftSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(600).nullable(),
  servings: z.number().int().min(1).max(24).nullable(),
  prepMin: z.number().int().min(0).max(600).nullable(),
  cookMin: z.number().int().min(0).max(1440).nullable(),
  tags: z.array(z.string().max(40)).max(10),
  category: z.enum(CATEGORIES).nullable(),
  cuisine: z.enum([...CUISINES, "ashkenaze"]).nullable(),
  ingredients: z
    .array(
      z.object({
        label: z.string().max(200),
        grams: z.number().min(0).max(100_000).nullable(),
        section: z.string().max(80).nullable(),
      }),
    )
    .max(30),
  steps: z
    .array(
      z.object({
        text: z.string().max(1200),
        durationMin: z.number().int().min(0).max(1440).nullable(),
        section: z.string().max(80).nullable(),
      }),
    )
    .max(25),
  sourceUrl: z.string().max(500).nullable(),
  sourceAuthor: z.string().max(120).nullable(),
  method: z.enum(["ai", "structured", "heuristic"]),
  reformulated: z.boolean(),
  icon: z.string().max(16).nullable(),
});

const questionSchema = z.object({
  ask: z.enum(["caption", "site_link"]),
  platform: z
    .enum(["instagram", "tiktok", "youtube", "web", "pinterest"])
    .nullable(),
  sourceUrl: z.string().max(500).nullable(),
  sourceAuthor: z.string().max(120).nullable(),
  title: z.string().max(2200).nullable(),
  links: z.array(z.string().max(500)).max(2),
});

const recipeRef = z.object({
  slug: z.string().min(1).max(120),
  title: z.string().max(200),
});

const stopSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("gate"),
    code: z.enum(["withdrawn", "blocked"]),
    creator: z.string().max(120).nullable(),
    originalUrl: z.string().max(500),
  }),
  z.object({
    kind: z.literal("official"),
    creator: z.string().max(120).nullable(),
    recipe: recipeRef,
  }),
  z.object({
    kind: z.literal("duplicate"),
    recipe: recipeRef.extend({ saved: z.boolean() }),
  }),
]);

export type JobStop = z.infer<typeof stopSchema>;
export type JobQuestion = Omit<NeedsInput, "kind">;

const resultSchema = z.object({
  draft: draftSchema.optional(),
  via: z.enum(["pinterest"]).nullable().optional(),
  question: questionSchema.optional(),
  stop: stopSchema.optional(),
});

export type JobState =
  | { status: "pending" }
  | { status: "ready"; draft: ImportDraft; via: "pinterest" | null }
  | ({ status: "needs_input" } & JobQuestion)
  | { status: "answered"; stop: JobStop }
  | { status: "failed"; code: FailCode }
  | { status: "saved"; recipeSlug: string | null }
  | { status: "dismissed" };

export type ImportJobView = {
  id: string;
  kind: "url" | "text" | "captures";
  createdAt: string;
  sourceUrl: string | null;
  state: JobState;
};

export type JobFinish = {
  status: "ready" | "needs_input" | "answered" | "failed";
  result: Record<string, unknown> | null;
  error: FailCode | null;
  /** The canonical address found for the post, when there is one. */
  sourceUrl: string | null;
};

/** What the runner writes for an outcome of the pipeline. */
export function outcomeToFinish(outcome: ImportOutcome): JobFinish {
  switch (outcome.kind) {
    case "draft":
      return {
        status: "ready",
        result: { draft: outcome.draft, via: outcome.via },
        error: null,
        sourceUrl: outcome.draft.sourceUrl,
      };
    case "needs_input": {
      const question: JobQuestion = {
        ask: outcome.ask,
        platform: outcome.platform,
        sourceUrl: outcome.sourceUrl,
        sourceAuthor: outcome.sourceAuthor,
        title: outcome.title,
        links: outcome.links,
      };
      return {
        status: "needs_input",
        result: { question },
        error: null,
        sourceUrl: question.sourceUrl,
      };
    }
    case "gate":
      return {
        status: "answered",
        result: {
          stop: {
            kind: "gate",
            code: outcome.code,
            creator: outcome.creator,
            originalUrl: outcome.originalUrl,
          },
        },
        error: null,
        sourceUrl: outcome.originalUrl,
      };
    case "official":
      return {
        status: "answered",
        result: {
          stop: {
            kind: "official",
            creator: outcome.creator,
            recipe: outcome.recipe,
          },
        },
        error: null,
        sourceUrl: null,
      };
    case "duplicate":
      return {
        status: "answered",
        result: { stop: { kind: "duplicate", recipe: outcome.recipe } },
        error: null,
        sourceUrl: null,
      };
    case "failed":
      return {
        status: "failed",
        result: null,
        error: outcome.code,
        sourceUrl: null,
      };
  }
}

type JobRow = {
  id: string;
  kind: string;
  status: string;
  created_at: string;
  source_url: string | null;
  result: unknown;
  error: string | null;
};

function failCode(error: string | null): FailCode {
  return (FAIL_CODES as readonly string[]).includes(error ?? "")
    ? (error as FailCode)
    : "fetch_failed";
}

/**
 * The job's JSON result. Some REST layers hand a JSON argument to a jsonb
 * parameter as a JSON string (the local bench does): read both forms.
 */
function resultValue(result: unknown): unknown {
  if (typeof result !== "string") return result ?? {};
  try {
    return JSON.parse(result) as unknown;
  } catch {
    return {};
  }
}

/** A job row as the member sees it; an unreadable result reads as a failure. */
export function jobView(
  row: JobRow,
  recipeSlug: string | null = null,
): ImportJobView {
  const kind =
    row.kind === "text" || row.kind === "captures" ? row.kind : "url";
  const base = {
    id: row.id,
    kind,
    createdAt: row.created_at,
    sourceUrl: row.source_url,
  } as const;
  const parsed = resultSchema.safeParse(resultValue(row.result));
  const result = parsed.success ? parsed.data : {};
  switch (row.status) {
    case "queued":
    case "running":
      return { ...base, state: { status: "pending" } };
    case "ready":
      return result.draft
        ? {
            ...base,
            state: {
              status: "ready",
              draft: result.draft,
              via: result.via ?? null,
            },
          }
        : { ...base, state: { status: "failed", code: "no_recipe" } };
    case "needs_input":
      return result.question
        ? { ...base, state: { status: "needs_input", ...result.question } }
        : { ...base, state: { status: "failed", code: "fetch_failed" } };
    case "answered":
      return result.stop
        ? { ...base, state: { status: "answered", stop: result.stop } }
        : { ...base, state: { status: "failed", code: "fetch_failed" } };
    case "saved":
      return { ...base, state: { status: "saved", recipeSlug } };
    case "dismissed":
      return { ...base, state: { status: "dismissed" } };
    default:
      return {
        ...base,
        state: { status: "failed", code: failCode(row.error) },
      };
  }
}

/** A few words for the job in « Mes imports ». */
export function jobLabel(view: ImportJobView): string | null {
  if (view.state.status === "ready") return view.state.draft.title;
  if (view.state.status === "needs_input" && view.state.title) {
    return view.state.title.slice(0, 80);
  }
  if (view.state.status === "answered" && view.state.stop.kind !== "gate") {
    return view.state.stop.recipe.title;
  }
  if (view.sourceUrl) {
    try {
      return new URL(view.sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }
  return null;
}
