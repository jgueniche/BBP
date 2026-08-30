"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { SendHorizonal } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { CoachBubble } from "@/components/coach/coach-bubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fr } from "@/i18n/fr";
import type { KemiaExpression } from "@/components/illustrations/kemia-avatar";

const t = fr.coach;

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function toUIMessages(history: StoredMessage[], greeting: string): UIMessage[] {
  const messages: UIMessage[] = history.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text", text: m.content }],
  }));
  if (messages.length === 0) {
    messages.push({
      id: "greeting",
      role: "assistant",
      parts: [{ type: "text", text: greeting }],
    });
  }
  return messages;
}

function messageText(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
    )
    .map((part) => part.text)
    .join("");
}

function expressionFor(index: number): KemiaExpression {
  const cycle: KemiaExpression[] = ["sourire", "clin", "douce", "fiere"];
  return cycle[index % cycle.length]!;
}

export function CoachChat({
  history,
  greeting,
  aiEnabled,
  messagesUsedToday,
  dailyQuota,
}: {
  history: StoredMessage[];
  greeting: string;
  aiEnabled: boolean;
  messagesUsedToday: number;
  dailyQuota: number;
}) {
  const [input, setInput] = useState("");
  const [sentCount, setSentCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/coach" }),
    messages: toUIMessages(history, greeting),
  });

  const quotaReached = messagesUsedToday + sentCount >= dailyQuota;
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy || quotaReached || !aiEnabled) return;
    setInput("");
    setSentCount((n) => n + 1);
    void sendMessage({ text });
  }

  let assistantIndex = -1;

  return (
    <section className="flex min-h-[calc(100dvh-160px)] flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          {t.title}
        </h1>
        <Link
          href="/coach/memoires"
          className="text-xs font-medium text-ink-70 underline underline-offset-4"
        >
          {t.memoriesLink}
        </Link>
      </header>

      <div className="flex flex-1 flex-col gap-4">
        {messages.map((message) => {
          const text = messageText(message);
          if (!text) return null;
          if (message.role === "assistant") {
            assistantIndex += 1;
            return (
              <CoachBubble
                key={message.id}
                expression={expressionFor(assistantIndex)}
              >
                {text}
              </CoachBubble>
            );
          }
          return (
            <div key={message.id} className="flex justify-end">
              <p className="max-w-[80%] rounded-lg rounded-br-[4px] border bg-ink-10 px-4 py-3 text-[15px]">
                {text}
              </p>
            </div>
          );
        })}

        {busy && <p className="text-sm text-ink-50">{t.thinking}</p>}
        {error && <CoachBubble expression="douce">{t.fallback}</CoachBubble>}
        {quotaReached && (
          <p className="rounded-lg bg-boutargue-tint p-3 text-sm text-[#3d3d3d]">
            {t.quotaReached}
          </p>
        )}
        {!aiEnabled && (
          <p className="rounded-lg bg-ink-10 p-3 text-sm text-ink-70">
            {t.aiOff}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-24 flex flex-col gap-1.5">
        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.inputPlaceholder}
            disabled={busy || quotaReached || !aiEnabled}
          />
          <Button
            type="submit"
            size="icon"
            aria-label={t.send}
            disabled={busy || quotaReached || !aiEnabled}
          >
            <SendHorizonal />
          </Button>
        </form>
        <p className="text-center text-[10px] text-ink-50">{t.disclaimer}</p>
      </div>
    </section>
  );
}
