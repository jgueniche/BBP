"use client";

import { EyeOff, PenLine, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  restorePost,
  setImportsBlocked,
  withdrawPost,
} from "@/app/(app)/createrices/actions";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

const s = fr.creators.space;

export type SpacePost = {
  key: string;
  url: string;
  title: string;
  saved: number;
  cooked: number;
  clicks: number;
  withdrawn: boolean;
};

/**
 * Her space: per-post numbers (never who), withdraw or restore a post,
 * refuse future imports. The team sees the same space to act on a request.
 */
export function CreatorSpace({
  creatorId,
  label,
  importsBlocked,
  posts,
  canPublish,
}: {
  creatorId: string;
  label: string;
  importsBlocked: boolean;
  posts: SpacePost[];
  /** Her own space (the team only moderates): « Publier ma version ». */
  canPublish: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<{ ok: boolean }>) {
    setPending(key);
    try {
      const result = await action();
      if (!result.ok) throw new Error("creator action failed");
      router.refresh();
      return true;
    } catch {
      toast(fr.creators.claim.error);
      return false;
    } finally {
      setPending(null);
    }
  }

  return (
    <section
      aria-labelledby="space-title"
      className="flex flex-col gap-4 rounded-lg bg-lilas p-4"
    >
      <div>
        <h2 id="space-title" className="font-display text-lg font-semibold">
          {s.title}
        </h2>
        <p className="text-xs text-ink-70">{s.intro}</p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{s.postsTitle}</h3>
        {posts.length === 0 ? (
          <p className="text-sm text-ink-70">{s.empty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {posts.map((post) => (
              <li
                key={post.key}
                className="flex flex-col gap-2 rounded-[10px] bg-card p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener"
                    className="block truncate text-sm font-semibold underline-offset-2 hover:underline"
                  >
                    {post.title}
                  </a>
                  <dl className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-70">
                    {(
                      [
                        [s.columns.saved, post.saved],
                        [s.columns.cooked, post.cooked],
                        [s.columns.clicks, post.clicks],
                      ] as const
                    ).map(([name, value]) => (
                      <div key={name} className="flex gap-1">
                        <dt>{name}</dt>
                        <dd className="font-mono font-semibold text-ink">
                          {value}
                        </dd>
                      </div>
                    ))}
                    {post.withdrawn && (
                      <div>
                        <dt className="sr-only">{s.columns.post}</dt>
                        <dd className="font-semibold">{s.withdrawn}</dd>
                      </div>
                    )}
                  </dl>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  {canPublish && (
                    <Button asChild size="sm" variant="ghost">
                      <Link
                        href={`/recettes/importer?url=${encodeURIComponent(post.url)}&credit=${encodeURIComponent(label)}`}
                      >
                        <PenLine />
                        {s.official}
                      </Link>
                    </Button>
                  )}
                  {post.withdrawn ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending === post.key}
                      onClick={async () => {
                        if (
                          await run(post.key, () =>
                            restorePost({ creatorId, key: post.key }),
                          )
                        ) {
                          toast(s.restored);
                        }
                      }}
                    >
                      <RotateCcw />
                      {s.restore}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending === post.key}
                      onClick={async () => {
                        if (!window.confirm(s.withdrawConfirm)) return;
                        if (
                          await run(post.key, () =>
                            withdrawPost({ creatorId, key: post.key }),
                          )
                        ) {
                          toast(s.withdrawnToast);
                        }
                      }}
                    >
                      <EyeOff />
                      {s.withdraw}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-ink-10 pt-3">
        <h3 className="text-sm font-semibold">{s.importsTitle}</h3>
        <p className="text-sm text-ink-70">
          {importsBlocked ? s.importsBlocked : s.importsAllowed}
        </p>
        <div>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending === "imports"}
            onClick={() =>
              run("imports", () =>
                setImportsBlocked(creatorId, !importsBlocked),
              )
            }
          >
            {importsBlocked ? s.allowImports : s.blockImports}
          </Button>
        </div>
      </div>
    </section>
  );
}
