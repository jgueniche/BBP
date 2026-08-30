"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { fr } from "@/i18n/fr";

import { deleteMemory } from "./actions";

const t = fr.coach;

export function MemoryList({
  memories,
}: {
  memories: Array<{ id: string; content: string; created_at: string }>;
}) {
  const router = useRouter();

  async function onDelete(id: string) {
    await deleteMemory(id);
    toast(t.memoryDeleted);
    router.refresh();
  }

  return (
    <ul className="flex flex-col gap-2">
      {memories.map((memory) => (
        <li
          key={memory.id}
          className="flex items-center gap-2 rounded-[16px] border-2 border-ink bg-paper p-3 text-sm shadow-sticker-sm"
        >
          <span className="flex-1">{memory.content}</span>
          <button
            type="button"
            onClick={() => onDelete(memory.id)}
            aria-label={t.memoryDelete}
            className="flex items-center gap-1 rounded-full border-2 border-ink px-2 py-0.5 text-xs font-semibold text-ink-70"
          >
            <X size={12} strokeWidth={2.5} />
            {t.memoryDelete}
          </button>
        </li>
      ))}
    </ul>
  );
}
