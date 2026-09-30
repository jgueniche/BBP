import {
  Bell,
  ChefHat,
  Heart,
  Lightbulb,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MemberAvatar } from "@/components/social/member-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { IlluCasserole } from "@/components/illustrations";
import { fr } from "@/i18n/fr";
import {
  groupNotificationEvents,
  isNotificationKind,
  type NotificationEvent,
  type NotificationGroup,
  type NotificationKind,
} from "@/lib/notifications/events";
import { notificationText } from "@/lib/notifications/text";
import { profileHref } from "@/lib/social/handles";
import { anonymousMember, loadMembers } from "@/lib/social/members";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

import { MarkSeen } from "./mark-seen";

const t = fr.notifications;

export const metadata = { title: t.title };

const ICONS: Record<NotificationKind, typeof Bell> = {
  follow: UserPlus,
  reaction: Heart,
  comment: MessageCircle,
  cooked: ChefHat,
  tip: Lightbulb,
};

const WINDOW_MS = 30 * 24 * 3600 * 1000;

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

export default async function NotificationsPage() {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: settings }, { data: rows }, { data: me }] = await Promise.all([
    supabase
      .from("user_settings")
      .select("notifications_seen_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.rpc("notification_events", {
      since: new Date(Date.now() - WINDOW_MS).toISOString(),
    }),
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const events: NotificationEvent[] = (rows ?? []).flatMap((row) =>
    isNotificationKind(row.kind)
      ? [
          {
            kind: row.kind,
            actorId: row.actor_id,
            postId: row.post_id,
            recipeId: row.recipe_id,
            createdAt: row.created_at,
          },
        ]
      : [],
  );
  const groups = groupNotificationEvents(
    events,
    settings?.notifications_seen_at ?? null,
  );

  const actorIds = groups.flatMap((group) => group.actorIds.slice(0, 3));
  const recipeIds = [
    ...new Set(
      groups
        .map((group) => group.recipeId)
        .filter((id): id is string => id !== null),
    ),
  ];
  const postIds = [
    ...new Set(
      groups
        .filter(
          (group) => group.kind === "reaction" || group.kind === "comment",
        )
        .map((group) => group.postId)
        .filter((id): id is string => id !== null),
    ),
  ];
  const [members, { data: recipes }, { data: posts }] = await Promise.all([
    loadMembers(supabase, actorIds),
    recipeIds.length > 0
      ? supabase.from("recipes").select("id, slug, title").in("id", recipeIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0
      ? supabase.from("posts").select("id, text").in("id", postIds)
      : Promise.resolve({ data: [] }),
  ]);
  const recipeById = new Map((recipes ?? []).map((r) => [r.id, r]));
  const excerptById = new Map(
    (posts ?? []).map((p) => [
      p.id,
      p.text ? (p.text.length > 80 ? `${p.text.slice(0, 80)}…` : p.text) : null,
    ]),
  );
  const myProfile = profileHref({ id: user.id, handle: me?.username ?? null });

  function hrefOf(group: NotificationGroup): string {
    const recipe = group.recipeId ? recipeById.get(group.recipeId) : undefined;
    switch (group.kind) {
      case "follow":
        return group.actorIds.length === 1
          ? profileHref(
              members.get(group.actorIds[0]!) ??
                anonymousMember(group.actorIds[0]!),
            )
          : "/communaute/reseau?liste=abonnes";
      case "cooked":
        return recipe ? `/recettes/${recipe.slug}#versions` : "/recettes";
      case "tip":
        return recipe ? `/recettes/${recipe.slug}#astuces` : "/recettes";
      default:
        return `${myProfile}?onglet=publications#post-${group.postId ?? ""}`;
    }
  }

  const unread = groups.filter((group) => group.unread);
  const earlier = groups.filter((group) => !group.unread);

  return (
    <section className="flex w-full max-w-2xl flex-col gap-5">
      <MarkSeen hasUnread={unread.length > 0} />
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {t.title}
          </h1>
          <p className="mt-1 text-sm text-ink-50">{t.intro}</p>
        </div>
        <Link
          href="/profil#notifications"
          className="text-xs font-semibold text-boutargue-deep underline-offset-2 hover:underline"
        >
          {t.settings}
        </Link>
      </header>

      {groups.length === 0 ? (
        <EmptyState
          illustration={<IlluCasserole size={64} />}
          title={t.empty}
        />
      ) : (
        (
          [
            [t.unread, unread],
            [t.earlier, earlier],
          ] as const
        ).map(([label, list]) =>
          list.length === 0 ? null : (
            <div key={label} className="flex flex-col gap-2">
              <h2 className="text-xs font-bold tracking-[0.1em] text-ink-50 uppercase">
                {label}
              </h2>
              <ul className="flex flex-col gap-2">
                {list.map((group) => {
                  const Icon = ICONS[group.kind];
                  // The face of the group is the person its sentence names.
                  const leadId =
                    group.actorIds.find((id) => members.get(id)?.name) ??
                    group.actorIds[0]!;
                  const lead = members.get(leadId) ?? anonymousMember(leadId);
                  const recipe = group.recipeId
                    ? recipeById.get(group.recipeId)
                    : undefined;
                  const excerpt = group.postId
                    ? excerptById.get(group.postId)
                    : null;
                  return (
                    <li key={group.key}>
                      <Link
                        href={hrefOf(group)}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-3 transition-colors hover:border-ink",
                          group.unread ? "bg-ciel" : "bg-card",
                        )}
                      >
                        <span className="relative">
                          <MemberAvatar
                            id={lead.id}
                            name={lead.name}
                            avatarUrl={lead.avatarUrl}
                            size="md"
                          />
                          <span className="absolute -right-1 -bottom-1 rounded-full border bg-card p-0.5 text-ink-70">
                            <Icon size={11} strokeWidth={2.2} aria-hidden />
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm">
                            {notificationText(group, {
                              nameOf: (id) => members.get(id)?.name ?? null,
                              recipeTitle: recipe?.title ?? null,
                            })}
                          </span>
                          {excerpt && (
                            <span className="mt-0.5 block truncate text-xs text-ink-50">
                              « {excerpt} »
                            </span>
                          )}
                          <span className="mt-0.5 block text-[11px] text-ink-50">
                            {timeAgo(group.latestAt)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ),
        )
      )}
    </section>
  );
}
