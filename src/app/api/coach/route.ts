import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";

import { extractMemories } from "@/ai/agents/memory-extractor";
import type { Json } from "@/db/types";
import { buildCoachSystem } from "@/ai/prompts/coach";
import { pickModel } from "@/ai/provider";
import { buildCoachTools } from "@/ai/tools/coach-tools";
import { buildCoachContext } from "@/lib/coach/context";
import { DAILY_MESSAGE_QUOTA } from "@/lib/coach/quota";
import { loadCalendarSettings } from "@/lib/jewish-calendar/cache";
import { buildCalendarContext } from "@/lib/jewish-calendar/context";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

function uiMessageText(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
    )
    .map((part) => part.text)
    .join("")
    .trim();
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const picked = pickModel("chat");
  if (!picked) {
    return NextResponse.json({ error: "ai_unconfigured" }, { status: 503 });
  }

  const {
    messages,
    conversationId: requestedConversationId,
  }: { messages: UIMessage[]; conversationId?: string } = await request.json();
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastUserText = lastUser ? uiMessageText(lastUser) : "";
  if (!lastUserText) {
    return NextResponse.json({ error: "empty_message" }, { status: 400 });
  }

  // Free-tier quota (brief §8): 30 coach messages per (UTC) day.
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("coach_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("role", "user")
    .gte("created_at", dayStart.toISOString());
  if ((count ?? 0) >= DAILY_MESSAGE_QUOTA) {
    return NextResponse.json({ error: "quota_exceeded" }, { status: 429 });
  }

  const [context, userCalendar] = await Promise.all([
    buildCoachContext(supabase, user.id),
    loadCalendarSettings(supabase, user.id),
  ]);
  const calendar = userCalendar.enabled
    ? buildCalendarContext(new Date(), userCalendar.settings)
    : { text: "", isFastToday: false };

  // Thread selection: the chat pins a conversation id; a missing or foreign
  // id falls back to the latest thread (or a fresh one) — legacy behavior.
  let conversationId: string | null = null;
  let conversationTitle: string | null = null;
  if (requestedConversationId) {
    const { data: requested } = await supabase
      .from("coach_conversations")
      .select("id, title")
      .eq("id", requestedConversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (requested) {
      conversationId = requested.id;
      conversationTitle = requested.title;
    }
  }
  if (conversationId === null) {
    const { data: existing } = await supabase
      .from("coach_conversations")
      .select("id, title")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      conversationId = existing.id;
      conversationTitle = existing.title;
    } else {
      const { data: created, error } = await supabase
        .from("coach_conversations")
        .insert({ user_id: user.id })
        .select("id")
        .single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      conversationId = created.id;
    }
  }

  // First message of an untitled thread names it (trimmed to a short label).
  if (!conversationTitle) {
    await supabase
      .from("coach_conversations")
      .update({
        title:
          lastUserText.length > 48
            ? `${lastUserText.slice(0, 47).trimEnd()}…`
            : lastUserText,
      })
      .eq("id", conversationId);
  }

  const safetyFlags = context.safeMode ? ["safe_mode"] : [];
  const { data: userMessageRow } = await supabase
    .from("coach_messages")
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: lastUserText,
      safety_flags: safetyFlags,
    })
    .select("id")
    .single();

  const system = buildCoachSystem({
    userContext: context.userContext,
    memories: context.memories,
    calendarContext: calendar.text,
    safeMode: context.safeMode,
  });

  const result = streamText({
    model: picked.model,
    system,
    messages: await convertToModelMessages(messages),
    tools: buildCoachTools({
      supabase,
      userId: user.id,
      safeMode: context.safeMode,
    }),
    stopWhen: stepCountIs(5),
    abortSignal: AbortSignal.timeout(55_000),
    onFinish: async ({ text, usage, steps }) => {
      const toolCalls = steps.flatMap((step) =>
        step.toolCalls.map((call) => ({
          name: call.toolName,
          input: JSON.parse(JSON.stringify(call.input ?? null)) as Json,
        })),
      );
      await supabase.from("coach_messages").insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: "assistant",
        content: text,
        tool_calls: toolCalls.length > 0 ? toolCalls : null,
        tokens_in: usage.inputTokens ?? null,
        tokens_out: usage.outputTokens ?? null,
        model: picked.modelId,
        safety_flags: safetyFlags,
      });
      await supabase
        .from("coach_conversations")
        .update({ title: lastUserText.slice(0, 60) })
        .eq("id", conversationId);

      // memory_extractor (brief §8): max 3 durable facts, deduplicated.
      try {
        if (context.safeMode) return;
        const facts = await extractMemories({
          userMessage: lastUserText,
          assistantMessage: text,
        });
        if (facts.length === 0) return;
        const { data: existingMemories } = await supabase
          .from("coach_memories")
          .select("content")
          .eq("user_id", user.id);
        const known = new Set(
          (existingMemories ?? []).map((m) => m.content.toLowerCase().trim()),
        );
        const fresh = facts.filter(
          (fact) => !known.has(fact.toLowerCase().trim()),
        );
        if (fresh.length > 0) {
          await supabase.from("coach_memories").insert(
            fresh.map((content) => ({
              user_id: user.id,
              content,
              source_message_id: userMessageRow?.id ?? null,
            })),
          );
        }
      } catch (error) {
        console.error("memory pipeline failed", error);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
