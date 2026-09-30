import { describe, expect, it } from "vitest";

import { jobLabel, jobView, outcomeToFinish } from "./jobs";
import type { ImportDraft } from "./pipeline";

const draft: ImportDraft = {
  title: "Gratin",
  description: null,
  servings: 4,
  prepMin: 15,
  cookMin: 60,
  tags: ["gratin"],
  category: "plat",
  cuisine: "france",
  ingredients: [{ label: "pommes de terre", grams: 800, section: null }],
  steps: [
    { text: "Tranche les pommes de terre.", durationMin: null, section: null },
  ],
  sourceUrl: "https://www.marmiton.org/recettes/recette_gratin_1.aspx",
  sourceAuthor: null,
  method: "structured",
  reformulated: false,
  icon: null,
};

const row = (status: string, result: unknown, error: string | null = null) => ({
  id: "11111111-1111-4111-8111-111111111111",
  kind: "url",
  status,
  created_at: "2026-09-30T10:00:00Z",
  source_url: "https://www.marmiton.org/recettes/recette_gratin_1.aspx",
  result,
  error,
});

describe("import jobs", () => {
  it("round-trips every outcome through the job row", () => {
    const ready = outcomeToFinish({ kind: "draft", draft, via: "pinterest" });
    expect(ready).toMatchObject({
      status: "ready",
      sourceUrl: draft.sourceUrl,
    });
    expect(jobView(row(ready.status, ready.result)).state).toEqual({
      status: "ready",
      draft,
      via: "pinterest",
    });

    const question = outcomeToFinish({
      kind: "needs_input",
      ask: "caption",
      platform: "instagram",
      sourceUrl: "https://www.instagram.com/p/C1aBcD2eFgH/",
      sourceAuthor: "@maya",
      title: null,
      links: [],
    });
    expect(jobView(row(question.status, question.result)).state).toMatchObject({
      status: "needs_input",
      ask: "caption",
      platform: "instagram",
      sourceAuthor: "@maya",
    });

    const stop = outcomeToFinish({
      kind: "duplicate",
      recipe: { slug: "gratin", title: "Gratin", saved: false },
    });
    expect(stop.status).toBe("answered");
    expect(jobView(row(stop.status, stop.result)).state).toEqual({
      status: "answered",
      stop: {
        kind: "duplicate",
        recipe: { slug: "gratin", title: "Gratin", saved: false },
      },
    });

    const failed = outcomeToFinish({ kind: "failed", code: "not_found" });
    expect(
      jobView(row(failed.status, failed.result, failed.error)).state,
    ).toEqual({
      status: "failed",
      code: "not_found",
    });
  });

  it("reads a result stored as a JSON string", () => {
    const ready = outcomeToFinish({ kind: "draft", draft, via: null });
    expect(
      jobView(row(ready.status, JSON.stringify(ready.result))).state,
    ).toMatchObject({ status: "ready", draft: { title: "Gratin" } });
    expect(jobView(row("ready", "{not json")).state).toEqual({
      status: "failed",
      code: "no_recipe",
    });
  });

  it("never trusts a malformed result", () => {
    expect(jobView(row("ready", { draft: { title: "" } })).state).toEqual({
      status: "failed",
      code: "no_recipe",
    });
    expect(jobView(row("failed", null, "drop table")).state).toEqual({
      status: "failed",
      code: "fetch_failed",
    });
    expect(jobView(row("running", null)).state).toEqual({ status: "pending" });
    expect(
      jobView(row("saved", null), { slug: "gratin", title: "Gratin" }).state,
    ).toEqual({ status: "saved", recipeSlug: "gratin", recipeTitle: "Gratin" });
  });

  it("labels a job by its draft or its site", () => {
    const ready = outcomeToFinish({ kind: "draft", draft, via: null });
    expect(jobLabel(jobView(row(ready.status, ready.result)))).toBe("Gratin");
    expect(jobLabel(jobView(row("queued", null)))).toBe("marmiton.org");
  });
});
