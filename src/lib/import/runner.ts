import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { extractRecipe } from "@/ai/agents/recipe-importer";
import { PROMPT_VERSION } from "@/ai/prompts/recipe-importer";
import { pickModel } from "@/ai/provider";
import type { Database } from "@/db/types";

import { CAPTURE_BUCKET } from "./captures";
import { outcomeToFinish } from "./jobs";
import {
  importFromImages,
  importFromText,
  importFromUrl,
  type ImportOutcome,
} from "./pipeline";
import { pipelineDeps } from "./server";

type Supabase = SupabaseClient<Database>;

const MEDIA_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  webp: "image/webp",
  png: "image/png",
};

async function downloadCaptures(
  supabase: Supabase,
  paths: string[],
): Promise<Array<{ base64: string; mediaType: string }>> {
  const images: Array<{ base64: string; mediaType: string }> = [];
  for (const path of paths) {
    const { data } = await supabase.storage.from(CAPTURE_BUCKET).download(path);
    if (!data) continue;
    const extension = path.split(".").pop() ?? "jpg";
    images.push({
      base64: Buffer.from(await data.arrayBuffer()).toString("base64"),
      mediaType: MEDIA_TYPES[extension] ?? "image/jpeg",
    });
  }
  return images;
}

/**
 * Runs one import job as its owner (her session, her RLS): takes it (a
 * 2-minute lease, so two requests never run it twice), imports, writes the
 * outcome, then deletes the captures. A transient error puts it back in the
 * queue; the page that follows it starts it again.
 */
export async function runImportJob(
  supabase: Supabase,
  userId: string,
  jobId: string,
): Promise<void> {
  const { data: claimed } = await supabase.rpc("claim_import_job", {
    p_job: jobId,
  });
  const job = claimed?.[0];
  if (!job) return;

  const picked = pickModel("chat");
  const deps = pipelineDeps(supabase, userId, picked ? extractRecipe : null);
  let outcome: ImportOutcome;
  try {
    if (job.kind === "captures") {
      const images = await downloadCaptures(supabase, job.capture_paths);
      outcome =
        images.length === 0
          ? { kind: "failed", code: "no_recipe" }
          : await importFromImages(deps, {
              images,
              note: job.input_text,
              sourceUrl: job.source_url,
              sourceAuthor: job.credit,
            });
    } else if (job.kind === "text") {
      outcome = await importFromText(deps, {
        text: job.input_text ?? "",
        title: null,
        sourceUrl: job.source_url,
        sourceAuthor: job.credit,
      });
    } else {
      outcome = await importFromUrl(deps, job.source_url ?? "", job.credit);
    }
  } catch (error) {
    console.error("import job failed", error);
    await supabase.rpc("requeue_import_job", { p_job: job.id });
    return;
  }

  const finish = outcomeToFinish(outcome);
  // Model and prompt are kept with a draft the AI wrote (product liability:
  // which version produced what).
  const usedAi =
    picked !== null &&
    outcome.kind === "draft" &&
    outcome.draft.method === "ai";
  const { data: finished } = await supabase.rpc("finish_import_job", {
    p_job: job.id,
    p_status: finish.status,
    p_result:
      finish.result as Database["public"]["Tables"]["import_jobs"]["Row"]["result"],
    p_error: finish.error,
    p_source_url: finish.sourceUrl,
    p_model: usedAi ? picked.modelId : null,
    p_prompt_version: usedAi ? PROMPT_VERSION : null,
  });
  // Read once, never kept: the captures go as soon as the job is done.
  if (finished && job.capture_paths.length > 0) {
    await supabase.storage.from(CAPTURE_BUCKET).remove(job.capture_paths);
  }
}
