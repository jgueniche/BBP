"use client";

import { MessagesSquare, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { fr } from "@/i18n/fr";
import { cn } from "@/lib/utils/cn";

import { deleteConversation, startConversation } from "./actions";

const t = fr.coach.conversations;

export type ConversationSummary = {
  id: string;
  title: string | null;
  updatedAt: string;
};

function relativeDay(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return t.today;
  if (days === 1) return t.yesterday;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function ConversationsMenu({
  conversations,
  activeId,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function onNew() {
    setPending(true);
    try {
      await startConversation();
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm(t.deleteConfirm)) return;
    setPending(true);
    try {
      await deleteConversation(id);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="secondary"
        onClick={onNew}
        disabled={pending}
        aria-label={t.newTitle}
      >
        <Plus />
        {t.newLabel}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button size="sm" variant="ghost" aria-label={t.list}>
            <MessagesSquare />
            <span className="hidden sm:inline">{t.list}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 max-w-[85vw]">
          <SheetHeader>
            <SheetTitle>{t.list}</SheetTitle>
          </SheetHeader>
          {conversations.length === 0 ? (
            <p className="px-4 text-sm text-ink-70">{t.empty}</p>
          ) : (
            <ul className="flex flex-col gap-1 overflow-y-auto px-2 pb-4">
              {conversations.map((conversation) => (
                <li
                  key={conversation.id}
                  className={cn(
                    "flex items-center gap-1 rounded-lg border px-2 py-1.5",
                    conversation.id === activeId
                      ? "border-boutargue bg-boutargue-tint"
                      : "border-transparent",
                  )}
                >
                  <Link
                    href={`/coach?c=${conversation.id}`}
                    onClick={() => setOpen(false)}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-sm font-semibold">
                      {conversation.title ?? t.untitled}
                    </p>
                    <p className="text-[11px] text-ink-50">
                      {relativeDay(conversation.updatedAt)}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(conversation.id)}
                    disabled={pending}
                    aria-label={t.deleteLabel}
                    className="shrink-0 rounded-full p-1.5 text-ink-50 hover:text-warn"
                  >
                    <Trash2 size={15} strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
