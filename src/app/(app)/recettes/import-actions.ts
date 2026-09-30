"use server";

import { after } from "next/server";
import { z } from "zod";

import { pickModel } from "@/ai/provider";
import { jobView, type ImportJobView, type JobStop } from "@/lib/import/jobs";
import {
  canonicalSource,
  guardPost,
  type ImportOutcome,
} from "@/lib/import/pipeline";
import { CAPTURE_BUCKET } from "@/lib/import/captures";
import { runImportJob } from "@/lib/import/runner";
import { pipelineDeps } from "@/lib/import/server";
import {
  detectSource,
  isPinterestShortLink,
  isTikTokShortLink,
} from "@/lib/import/sources";
import { createClient } from "@/lib/supabase/server";

// Imports go through a job queue (ADR-036): the action checks what it can
// at once (the creator's wishes, my own copy), enqueues within the quotas,
// then runs the job after answering. The page follows the job and starts it
// again if needed (lease, retries).

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type StartResult =
  | { ok: true; jobId: string }
  | {
      ok: false;
      code:
        | "invalid_url"
        | "invalid"
        | "needs_ai"
        | "quota_daily"
        | "quota_captures"
        | "busy";
    }
  | { ok: false; code: "stop"; stop: JobStop };

const credit = z.string().trim().max(60).nullable();
const capturePath = z
  .string()
  .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|webp|png)$/);

const startSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("url"),
    url: z.string().trim().min(8).max(500),
    credit,
  }),
  z.object({
    kind: z.literal("text"),
    text: z.string().trim().min(20).max(20_000),
    title: z.string().trim().max(200).nullable(),
    sourceUrl: z.string().trim().max(500).nullable(),
    credit,
  }),
  z.object({
    kind: z.literal("captures"),
    paths: z.array(capturePath).min(1).max(6),
    note: z.string().trim().max(500).nullable(),
    sourceUrl: z.string().trim().max(500).nullable(),
    credit,
  }),
]);

const enqueueAnswer = z.union([
  z.object({ id: z.uuid(), reused: z.boolean() }),
  z.object({
    error: z.enum(["auth", "invalid", "quota_daily", "quota_captures", "busy"]),
  }),
]);

function toStop(outcome: ImportOutcome): JobStop | null {
  switch (outcome.kind) {
    case "gate":
      return {
        kind: "gate",
        code: outcome.code,
        creator: outcome.creator,
        originalUrl: outcome.originalUrl,
      };
    case "official":
      return {
        kind: "official",
        creator: outcome.creator,
        recipe: outcome.recipe,
      };
    case "duplicate":
      return { kind: "duplicate", recipe: outcome.recipe };
    default:
      return null;
  }
}

/** Captures are read once: anything left over for a day goes. */
async function removeCaptures(supabase: Supabase, paths: string[]) {
  if (paths.length > 0)
    await supabase.storage.from(CAPTURE_BUCKET).remove(paths);
}

async function removeStaleCaptures(supabase: Supabase, userId: string) {
  const { data } = await supabase.storage
    .from(CAPTURE_BUCKET)
    .list(userId, { limit: 100 });
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  const stale = (data ?? [])
    .filter((file) => file.created_at && Date.parse(file.created_at) < dayAgo)
    .map((file) => `${userId}/${file.name}`);
  await removeCaptures(supabase, stale);
}

/** The address a link stands for without any network call, when known. */
function knownSource(url: string): string | null {
  const kind = detectSource(url);
  if (!kind || kind === "pinterest") return null;
  if (isTikTokShortLink(url) || isPinterestShortLink(url)) return null;
  return canonicalSource(url);
}

export async function startImport(
  raw: z.input<typeof startSchema>,
): Promise<StartResult> {
  const input = startSchema.parse(raw);
  const { supabase, user } = await requireUser();
  const captures = input.kind === "captures" ? input.paths : [];
  if (captures.some((path) => !path.startsWith(`${user.id}/`))) {
    return { ok: false, code: "invalid" };
  }
  if (input.kind === "url" && !detectSource(input.url)) {
    await removeCaptures(supabase, captures);
    return { ok: false, code: "invalid_url" };
  }
  if (input.kind === "captures" && !pickModel("chat")) {
    await removeCaptures(supabase, captures);
    return { ok: false, code: "needs_ai" };
  }

  // What can be told at once is told at once, without a job.
  const source =
    input.kind === "url"
      ? knownSource(input.url)
      : canonicalSource(input.sourceUrl);
  if (source) {
    const guarded = await guardPost(
      pipelineDeps(supabase, user.id, null),
      source,
      input.credit,
    );
    const stop = guarded ? toStop(guarded) : null;
    if (stop) {
      await removeCaptures(supabase, captures);
      return { ok: false, code: "stop", stop };
    }
  }

  const { data } = await supabase.rpc("enqueue_import", {
    p_kind: input.kind,
    p_url: input.kind === "url" ? input.url : source,
    p_text:
      input.kind === "text"
        ? input.title
          ? `${input.title}\n${input.text}`
          : input.text
        : input.kind === "captures"
          ? input.note
          : null,
    p_credit: input.credit,
    p_captures: input.kind === "captures" ? input.paths : null,
  });
  const answer = enqueueAnswer.safeParse(data);
  if (!answer.success || "error" in answer.data) {
    await removeCaptures(supabase, captures);
    const error =
      answer.success && "error" in answer.data ? answer.data.error : "invalid";
    return { ok: false, code: error === "auth" ? "invalid" : error };
  }
  const jobId = answer.data.id;
  if (captures.length > 0) {
    after(() => removeStaleCaptures(supabase, user.id));
  }
  after(() => runImportJob(supabase, user.id, jobId));
  return { ok: true, jobId };
}

const continueSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    text: z.string().trim().min(20).max(20_000),
    credit,
  }),
  z.object({
    kind: z.literal("captures"),
    paths: z.array(capturePath).min(1).max(6),
    note: z.string().trim().max(500).nullable(),
    credit,
  }),
]);

/** The answer to a job's question (the caption, captures): same job, counted once. */
export async function continueImport(
  rawJobId: string,
  raw: z.input<typeof continueSchema>,
): Promise<StartResult> {
  const jobId = z.uuid().parse(rawJobId);
  const input = continueSchema.parse(raw);
  const { supabase, user } = await requireUser();
  const captures = input.kind === "captures" ? input.paths : [];
  if (captures.some((path) => !path.startsWith(`${user.id}/`))) {
    return { ok: false, code: "invalid" };
  }
  if (input.kind === "captures" && !pickModel("chat")) {
    await removeCaptures(supabase, captures);
    return { ok: false, code: "needs_ai" };
  }
  const { data } = await supabase.rpc("continue_import_job", {
    p_job: jobId,
    p_kind: input.kind,
    p_text: input.kind === "text" ? input.text : input.note,
    p_credit: input.credit,
    p_captures: input.kind === "captures" ? input.paths : null,
  });
  const answer = enqueueAnswer.safeParse(data);
  if (!answer.success || "error" in answer.data) {
    await removeCaptures(supabase, captures);
    const error =
      answer.success && "error" in answer.data ? answer.data.error : "invalid";
    return { ok: false, code: error === "auth" ? "invalid" : error };
  }
  after(() => runImportJob(supabase, user.id, jobId));
  return { ok: true, jobId };
}

const JOB_COLUMNS =
  "id, kind, status, created_at, source_url, result, error, not_before, locked_until, recipe_id";

type JobRow = {
  id: string;
  kind: string;
  status: string;
  created_at: string;
  source_url: string | null;
  result: unknown;
  error: string | null;
  not_before: string;
  locked_until: string | null;
  recipe_id: string | null;
};

/** A waiting job whose time has come, or whose runner vanished. */
function needsRunner(row: JobRow, now = Date.now()): boolean {
  if (row.status === "queued") return Date.parse(row.not_before) <= now;
  return (
    row.status === "running" &&
    row.locked_until !== null &&
    Date.parse(row.locked_until) < now
  );
}

async function viewsOf(
  supabase: Supabase,
  userId: string,
  rows: JobRow[],
): Promise<ImportJobView[]> {
  const recipeIds = rows
    .map((row) => (row.status === "saved" ? row.recipe_id : null))
    .filter((id): id is string => id !== null);
  const recipes = new Map<string, { slug: string; title: string }>();
  if (recipeIds.length > 0) {
    const { data } = await supabase
      .from("recipes")
      .select("id, slug, title")
      .in("id", recipeIds);
    for (const recipe of data ?? []) recipes.set(recipe.id, recipe);
  }
  for (const row of rows) {
    if (needsRunner(row)) after(() => runImportJob(supabase, userId, row.id));
  }
  return rows.map((row) =>
    jobView(row, row.recipe_id ? (recipes.get(row.recipe_id) ?? null) : null),
  );
}

/** One job, as the importer follows it (and starts it again if needed). */
export async function getImportJob(
  rawJobId: string,
): Promise<ImportJobView | null> {
  const jobId = z.uuid().parse(rawJobId);
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("import_jobs")
    .select(JOB_COLUMNS)
    .eq("id", jobId)
    .maybeSingle();
  if (!data) return null;
  const [view] = await viewsOf(supabase, user.id, [data]);
  return view ?? null;
}

/** « Mes imports »: the last week's jobs I have not dismissed. */
export async function listImportJobs(): Promise<ImportJobView[]> {
  const { supabase, user } = await requireUser();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("import_jobs")
    .select(JOB_COLUMNS)
    .eq("user_id", user.id)
    .neq("status", "dismissed")
    .gte("created_at", weekAgo)
    .order("created_at", { ascending: false })
    .limit(20);
  return viewsOf(supabase, user.id, data ?? []);
}

export async function dismissImportJob(rawJobId: string) {
  const jobId = z.uuid().parse(rawJobId);
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("import_jobs")
    .select("capture_paths")
    .eq("id", jobId)
    .maybeSingle();
  await removeCaptures(supabase, data?.capture_paths ?? []);
  await supabase.rpc("dismiss_import_job", { p_job: jobId });
  return { ok: true as const };
}

const quotaSchema = z.object({
  used: z.number(),
  limit: z.number(),
  captures_used: z.number(),
  captures_limit: z.number(),
});

export type ImportQuota = { left: number; capturesLeft: number };

export async function importQuota(): Promise<ImportQuota | null> {
  const { supabase } = await requireUser();
  const { data } = await supabase.rpc("import_quota");
  const parsed = quotaSchema.safeParse(data);
  if (!parsed.success) return null;
  return {
    left: Math.max(0, parsed.data.limit - parsed.data.used),
    capturesLeft: Math.max(
      0,
      Math.min(
        parsed.data.captures_limit - parsed.data.captures_used,
        parsed.data.limit - parsed.data.used,
      ),
    ),
  };
}
