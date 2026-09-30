"use client";

import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { joinAsCreator } from "@/app/(app)/createrices/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fr } from "@/i18n/fr";
import {
  CREATOR_PLATFORMS,
  type CreatorPlatform,
} from "@/lib/creators/identity";

const t = fr.creators.join;

export type MyCreatorProfile = {
  label: string;
  path: string;
  /** Verified, or a claim still being checked. */
  verified: boolean;
};

/** « Tu es créatrice ? »: links her account or site, then the claim. */
export function CreatorCard({ profiles }: { profiles: MyCreatorProfile[] }) {
  const router = useRouter();
  const [platform, setPlatform] = useState<CreatorPlatform>("instagram");
  const [handle, setHandle] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await joinAsCreator({ platform, handle });
      if (!result.ok) {
        toast(result.code === "invalid" ? t.invalid : fr.creators.claim.error);
        return;
      }
      if (!result.claim.ok && result.claim.code === "claimed") {
        toast(fr.creators.claim.alreadyClaimed);
        return;
      }
      router.push(`${result.path}#revendiquer`);
    } catch {
      toast(fr.creators.claim.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <div id="createrice" className="scroll-mt-6 rounded-lg bg-beurre p-4">
      <p className="flex items-center gap-2 font-display text-lg font-semibold">
        <BadgeCheck size={18} strokeWidth={2} aria-hidden />
        {t.title}
      </p>
      <p className="mt-1 text-xs text-ink-70">{t.intro}</p>

      {profiles.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-semibold">{t.mine}</p>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {profiles.map((profile) => (
              <li key={profile.path} className="flex items-center gap-2">
                <Link
                  href={profile.path}
                  className="font-semibold underline underline-offset-2"
                >
                  {profile.label}
                </Link>
                <span className="text-xs text-ink-70">
                  {profile.verified ? fr.creators.badge : t.pending}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold">
            {t.platform}
            <select
              value={platform}
              onChange={(event) =>
                setPlatform(event.target.value as CreatorPlatform)
              }
              className="rounded-[10px] border bg-card px-2 py-2 text-sm font-medium"
            >
              {CREATOR_PLATFORMS.map((value) => (
                <option key={value} value={value}>
                  {fr.creators.platforms[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold">
            {t.handle}
            <Input
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              placeholder={t.handlePlaceholder}
              maxLength={120}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </label>
        </div>
        <div>
          <Button type="submit" size="sm" disabled={pending}>
            {t.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
