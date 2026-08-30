import "server-only";

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

// ADR-010: Gemini Flash by default (cost), Claude as fallback provider.
// "chat" carries the coach conversation; "light" runs extraction and memory jobs.
const MODELS = {
  google: { chat: "gemini-3.7-flash", light: "gemini-3.7-flash" },
  anthropic: { chat: "claude-sonnet-5", light: "claude-haiku-4-5" },
} as const;

export type ModelKind = keyof (typeof MODELS)["google"];

export function pickModel(
  kind: ModelKind,
): { model: LanguageModel; modelId: string } | null {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const modelId = MODELS.google[kind];
    return { model: google(modelId), modelId };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    const modelId = MODELS.anthropic[kind];
    return { model: anthropic(modelId), modelId };
  }
  return null;
}

export function isAiConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.ANTHROPIC_API_KEY,
  );
}
