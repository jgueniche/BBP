import { isAiConfigured } from "@/ai/provider";
import { fr } from "@/i18n/fr";
import { DAILY_MESSAGE_QUOTA } from "@/lib/coach/quota";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { CoachChat, type StoredMessage } from "./chat";
import {
  ConversationsMenu,
  type ConversationSummary,
} from "./conversations-menu";

const t = fr.coach;

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;

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
      .limit(30),
    supabase
      .from("coach_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("role", "user")
      .gte("created_at", dayStart.toISOString()),
  ]);

  const conversations: ConversationSummary[] = (
    conversationsRes.data ?? []
  ).map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at,
  }));

  // Active thread: ?c= when it is one of ours, else the most recent one.
  const requested = conversations.find((conversation) => conversation.id === c);
  const active = requested ?? conversations[0] ?? null;

  const { data: messageRows } = active
    ? await supabase
        .from("coach_messages")
        .select("id, role, content")
        .eq("user_id", user.id)
        .eq("conversation_id", active.id)
        .in("role", ["user", "assistant"])
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  const history: StoredMessage[] = (messageRows ?? [])
    .reverse()
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const greeting = t.greeting.replace(
    "{name}",
    profileRes.data?.display_name ?? t.greetingFallbackName,
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      <CoachChat
        key={active?.id ?? "none"}
        conversationId={active?.id ?? null}
        history={history}
        greeting={greeting}
        aiEnabled={isAiConfigured()}
        messagesUsedToday={quotaRes.count ?? 0}
        dailyQuota={DAILY_MESSAGE_QUOTA}
        conversationsSlot={
          <ConversationsMenu
            conversations={conversations.filter(
              (conversation) =>
                conversation.title !== null || conversation.id === active?.id,
            )}
            activeId={active?.id ?? null}
          />
        }
      />
    </div>
  );
}
