"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { History, NotebookPen, Plus, SendHorizonal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { CoachBubble } from "@/components/coach/coach-bubble";
import type { KemiaExpression } from "@/components/illustrations/kemia-avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { fr } from "@/i18n/fr";
import { cn } from "@/lib/utils/cn";

import { createConversation, deleteConversation } from "./actions";

const t = fr.coach;

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type ConversationSummary = {
  id: string;
  title: string | null;
  updated_at: string;
};

const conversationDateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

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

function ConversationsSheet({
  conversations,
  activeConversationId,
}: {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onNew() {
    startTransition(() => createConversation());
  }

  function onDelete(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    startTransition(async () => {
      await deleteConversation(id);
      setConfirmId(null);
      toast(t.conversationDeleted);
      if (id === activeConversationId) {
        setOpen(false);
        router.push("/coach");
      }
      router.refresh();
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmId(null);
      }}
    >
      <SheetTrigger asChild>
        <Button variant="secondary" size="icon-sm" aria-label={t.conversationsOpen}>
          <History />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader className="pb-0">
          <SheetTitle>{t.conversationsTitle}</SheetTitle>
          <SheetDescription>{t.conversationsHint}</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onNew}
            disabled={pending}
            className="justify-start gap-2"
          >
            <Plus />
            {t.newConversation}
          </Button>

          {conversations.length === 0 ? (
            <p className="text-sm text-ink-70">{t.conversationsEmpty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {conversations.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                return (
                  <li
                    key={conversation.id}
                    className={cn(
                      "flex items-center gap-1 rounded-[14px] border bg-card p-1.5 shadow-soft",
                      isActive && "border-boutargue",
                    )}
                  >
                    <Link
                      href={`/coach?c=${conversation.id}`}
                      onClick={() => setOpen(false)}
                      className="min-w-0 flex-1 rounded-[10px] px-2 py-1 hover:bg-ink-10/60"
                    >
                      <span className="block truncate text-sm font-medium">
                        {conversation.title ?? t.conversationUntitled}
                      </span>
                      <span className="text-xs text-ink-50">
                        {conversationDateFormat.format(
                          new Date(conversation.updated_at),
                        )}
                        {isActive ? ` · ${t.conversationActive}` : ""}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(conversation.id)}
                      disabled={pending}
                      aria-label={t.conversationDelete}
                      className="flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold text-ink-70 hover:bg-ink-10/60 disabled:opacity-50"
                    >
                      {confirmId === conversation.id ? (
                        t.conversationDeleteConfirm
                      ) : (
                        <Trash2 size={14} strokeWidth={2} aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <SheetFooter className="pt-0">
          <Link
            href="/coach/memoires"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 text-sm font-medium text-ink-70 underline underline-offset-4"
          >
            <NotebookPen size={16} strokeWidth={2} aria-hidden />
            {t.memoriesLink}
          </Link>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label={t.thinking}>
      <span className="size-1.5 rounded-full bg-[#0b0b0b]/60 motion-safe:animate-bounce" />
      <span className="size-1.5 rounded-full bg-[#0b0b0b]/60 motion-safe:animate-bounce [animation-delay:150ms]" />
      <span className="size-1.5 rounded-full bg-[#0b0b0b]/60 motion-safe:animate-bounce [animation-delay:300ms]" />
    </span>
  );
}

export function CoachChat({
  conversationId,
  conversations,
  history,
  greeting,
  aiEnabled,
  messagesUsedToday,
  dailyQuota,
}: {
  conversationId: string | null;
  conversations: ConversationSummary[];
  history: StoredMessage[];
  greeting: string;
  aiEnabled: boolean;
  messagesUsedToday: number;
  dailyQuota: number;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [sentCount, setSentCount] = useState(0);
  // Captured at mount: after router.refresh() the server count already
  // includes locally sent messages — adding sentCount would double-count.
  const [initialUsed] = useState(messagesUsedToday);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [newPending, startNewTransition] = useTransition();

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/coach",
      body: { conversationId },
    }),
    messages: toUIMessages(history, greeting),
    // Re-sync the conversation list (order, auto-title, fresh id) once the
    // answer is complete; useChat keeps the streamed messages on refresh.
    onFinish: () => router.refresh(),
  });

  const quotaReached = initialUsed + sentCount >= dailyQuota;
  const busy = status === "submitted" || status === "streaming";
  const canSend = aiEnabled && !quotaReached && !busy;

  const lastMessage = messages[messages.length - 1];
  const awaitingReply =
    busy &&
    (!lastMessage ||
      lastMessage.role !== "assistant" ||
      messageText(lastMessage).length === 0);

  // Chat owns its scroll: keep the latest exchange in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  // Auto-grow the textarea with its content (capped at ~6 lines).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  function submit() {
    const text = input.trim();
    if (!text || !canSend) return;
    setInput("");
    setSentCount((n) => n + 1);
    void sendMessage({ text });
  }

  let assistantIndex = -1;

  return (
    <section className="flex h-[calc(100dvh-8.5rem)] flex-col gap-3 lg:h-[calc(100dvh-5rem)]">
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {t.title}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label={t.newConversation}
            title={t.newConversation}
            disabled={newPending}
            onClick={() => startNewTransition(() => createConversation())}
          >
            <Plus />
          </Button>
          <ConversationsSheet
            conversations={conversations}
            activeConversationId={conversationId}
          />
        </div>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="flex flex-col gap-4 py-2">
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
                <p className="max-w-[80%] rounded-lg rounded-br-[4px] border bg-ink-10 px-4 py-3 text-[15px] break-words whitespace-pre-wrap">
                  {text}
                </p>
              </div>
            );
          })}

          {awaitingReply && (
            <CoachBubble expression="douce">
              <TypingIndicator />
            </CoachBubble>
          )}
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
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="flex items-end gap-2 rounded-[14px] border border-input bg-card p-2 shadow-soft transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30"
        >
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={t.inputPlaceholder}
            disabled={quotaReached || !aiEnabled}
            className="max-h-40 min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
          <Button
            type="submit"
            size="icon"
            aria-label={t.send}
            disabled={!canSend || input.trim().length === 0}
          >
            <SendHorizonal />
          </Button>
        </form>
        <p className="text-center text-[10px] text-ink-50">{t.disclaimer}</p>
      </div>
    </section>
  );
}
