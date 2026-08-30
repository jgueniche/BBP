import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { generateNudgeBody, type NudgeSlot } from "@/ai/agents/nudger";
import type { Database } from "@/db/types";
import { fr } from "@/i18n/fr";
import { isQuietTime } from "@/lib/jewish-calendar/quiet";
import {
  isPushConfigured,
  sendPush,
  type PushSubscriptionRow,
} from "@/lib/push/send";
import { supabaseUrl } from "@/lib/supabase/config";

export const maxDuration = 300;

const t = fr.notifications;

type NotificationKind =
  "nudge_matin" | "nudge_soir" | "erev_chabbat" | "recap_hebdo";

const SLOT_KIND: Record<NudgeSlot, NotificationKind> = {
  matin: "nudge_matin",
  soir: "nudge_soir",
  dafina: "erev_chabbat",
  recap: "recap_hebdo",
};

const SLOT_TITLE: Record<NudgeSlot, string> = {
  matin: t.matinTitle,
  soir: t.soirTitle,
  dafina: t.dafinaTitle,
  recap: t.recapTitle,
};

const SLOT_URL: Record<NudgeSlot, string> = {
  matin: "/poids",
  soir: "/journal",
  dafina: "/planning",
  recap: "/progres",
};

const PARIS_DATE = new Intl.DateTimeFormat("fr-CA", {
  timeZone: "Europe/Paris",
});
const PARIS_WEEKDAY = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Paris",
  weekday: "short",
});
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ServiceClient = ReturnType<typeof createServiceClient<Database>>;

/**
 * Daily nudge cron (brief §4.11). One Vercel cron on the Hobby plan, so a
 * single morning run infers the slot: Friday → dafina, Sunday → weekly
 * recap, otherwise morning weigh-in. `?slot=` overrides for manual runs.
 * Hard rules: quiet hours (chabbat/chag) for observant users, max 2
 * notifications per Paris day via the `notifications` log.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "service role key not configured" },
      { status: 501 },
    );
  }
  if (!isPushConfigured) {
    return NextResponse.json(
      { error: "VAPID keys not configured; nudges disabled" },
      { status: 501 },
    );
  }

  const now = new Date();
  const parisDate = PARIS_DATE.format(now);
  const weekday = WEEKDAYS.indexOf(PARIS_WEEKDAY.format(now));
  const dayOfYear = Math.floor(
    (Date.parse(parisDate) - Date.parse(`${parisDate.slice(0, 4)}-01-01`)) /
      86_400_000,
  );

  const slotParam = new URL(request.url).searchParams.get("slot");
  const slot: NudgeSlot =
    slotParam === "matin" ||
    slotParam === "soir" ||
    slotParam === "dafina" ||
    slotParam === "recap"
      ? slotParam
      : weekday === 5
        ? "dafina"
        : weekday === 0
          ? "recap"
          : "matin";
  const kind = SLOT_KIND[slot];

  const supabase = createServiceClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");
  const userIds = [...new Set((subs ?? []).map((s) => s.user_id))];
  if (userIds.length === 0) {
    return NextResponse.json({ slot, users: 0, sent: 0 });
  }

  const [{ data: settings }, { data: recents }] = await Promise.all([
    supabase
      .from("user_settings")
      .select("user_id, jewish_calendar_enabled")
      .in("user_id", userIds),
    supabase
      .from("notifications")
      .select("user_id, kind, created_at")
      .in("user_id", userIds)
      .gte(
        "created_at",
        new Date(now.getTime() - 36 * 3_600_000).toISOString(),
      ),
  ]);
  const calendarByUser = new Map(
    (settings ?? []).map((s) => [s.user_id, s.jewish_calendar_enabled]),
  );
  const subsByUser = new Map<string, PushSubscriptionRow[]>();
  for (const sub of subs ?? []) {
    const list = subsByUser.get(sub.user_id) ?? [];
    list.push(sub);
    subsByUser.set(sub.user_id, list);
  }

  const quiet = isQuietTime(now);
  const goneEndpoints: string[] = [];
  let sent = 0;
  let skipped = 0;

  for (const userId of userIds) {
    const calendarEnabled = calendarByUser.get(userId) ?? true;
    // DoD: nothing leaves the building during chabbat/chag for observant users.
    if (calendarEnabled && quiet) {
      skipped += 1;
      continue;
    }
    if (slot === "dafina" && !calendarEnabled) {
      skipped += 1;
      continue;
    }
    const todays = (recents ?? []).filter(
      (r) =>
        r.user_id === userId &&
        PARIS_DATE.format(new Date(r.created_at)) === parisDate,
    );
    if (todays.length >= 2 || todays.some((r) => r.kind === kind)) {
      skipped += 1;
      continue;
    }

    const body =
      slot === "recap"
        ? await recapBody(supabase, userId, parisDate)
        : await generateNudgeBody({ slot, parisWeekday: weekday, dayOfYear });
    const payload = { title: SLOT_TITLE[slot], body, url: SLOT_URL[slot] };

    let delivered = false;
    for (const sub of subsByUser.get(userId) ?? []) {
      const result = await sendPush(sub, payload);
      if (result === "sent") delivered = true;
      if (result === "gone") goneEndpoints.push(sub.endpoint);
    }
    if (!delivered) continue;

    await supabase.from("notifications").insert({
      user_id: userId,
      kind,
      title: payload.title,
      body,
      url: payload.url,
    });
    sent += 1;
    if (slot === "recap") await sendRecapEmail(supabase, userId, body);
  }

  if (goneEndpoints.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", goneEndpoints);
  }

  return NextResponse.json({
    slot,
    quiet,
    users: userIds.length,
    sent,
    skipped,
  });
}

async function recapBody(
  supabase: ServiceClient,
  userId: string,
  parisDate: string,
): Promise<string> {
  const weekAgo = new Date(Date.parse(parisDate) - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const [logsRes, sessionsRes] = await Promise.all([
    supabase
      .from("food_logs")
      .select("date")
      .eq("user_id", userId)
      .gte("date", weekAgo),
    supabase
      .from("workout_sessions")
      .select("id")
      .eq("user_id", userId)
      .gte("date", weekAgo),
  ]);
  const journalDays = new Set((logsRes.data ?? []).map((l) => l.date)).size;
  return t.recapBody(journalDays, (sessionsRes.data ?? []).length);
}

/** Weekly recap by email too, when a Resend key is configured. Best-effort. */
async function sendRecapEmail(
  supabase: ServiceClient,
  userId: string,
  body: string,
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    const { data } = await supabase.auth.admin.getUserById(userId);
    const email = data.user?.email;
    if (!email) return;
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://bbp-mu.vercel.app";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "BBP <onboarding@resend.dev>",
        to: [email],
        subject: t.recapTitle,
        text: `${body}\n\n${siteUrl}/progres`,
      }),
    });
  } catch (error) {
    console.error("recap email failed", error);
  }
}
