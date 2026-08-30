import { isAiConfigured } from "@/ai/provider";
import { fr } from "@/i18n/fr";
import { DAILY_MESSAGE_QUOTA } from "@/lib/coach/quota";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import {
  CoachChat,
  type ConversationSummary,
  type StoredMessage,
} from "./chat";

const t = fr.coach;

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <section className="mx-auto w-full max-w-3xl">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {t.title}
        </h1>
        <p className="mt-4 text-ink-70">{fr.auth.notConfigured}</p>
      </section>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { c } = await searchParams;

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const [profileRes, conversationsRes, quotaRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("coach_conversations")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("coach_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("role", "user")
      .gte("created_at", dayStart.toISOString()),
  ]);

  const conversations: ConversationSummary[] = conversationsRes.data ?? [];
  // `?c=<id>` selects a conversation; default to the most recent one.
  const active =
    conversations.find((conv) => conv.id === c) ?? conversations[0] ?? null;

  let history: StoredMessage[] = [];
  if (active) {
    const { data: messages } = await supabase
      .from("coach_messages")
      .select("id, role, content")
      .eq("conversation_id", active.id)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: false })
      .limit(50);
    history = (messages ?? [])
      .reverse()
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
  }

  const greeting = t.greeting.replace(
    "{name}",
    profileRes.data?.display_name ?? t.greetingFallbackName,
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      <CoachChat
        key={active?.id ?? "new"}
        conversationId={active?.id ?? null}
        conversations={conversations}
        history={history}
        greeting={greeting}
        aiEnabled={isAiConfigured()}
        messagesUsedToday={quotaRes.count ?? 0}
        dailyQuota={DAILY_MESSAGE_QUOTA}
      />
    </div>
  );
}
