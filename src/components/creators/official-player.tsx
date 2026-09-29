"use client";

import { Play } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";
import type { OfficialEmbed } from "@/lib/creators/embed";
import { cn } from "@/lib/utils/cn";

const t = fr.creators.credit;

/**
 * The platform's own player, loaded only on a tap: until then nothing is
 * requested from TikTok, Instagram or YouTube (YouTube without cookies).
 */
export function OfficialPlayer({
  embed,
  title,
}: {
  embed: OfficialEmbed;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const platform = fr.creators.platforms[embed.platform];

  if (!open) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Play />
          {embed.platform === "instagram" ? t.showPost : t.showVideo}
        </Button>
        <p className="text-[11px] text-ink-50">
          {t.playerNotice.replace("{platform}", platform)}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div
        className={cn(
          "w-full overflow-hidden rounded-lg border bg-ink-10",
          embed.platform === "instagram"
            ? "h-[640px] max-w-[400px]"
            : embed.shape === "portrait"
              ? "aspect-[9/16] max-w-[325px]"
              : "aspect-video max-w-[640px]",
        )}
      >
        <iframe
          src={embed.src}
          title={`${platform} · ${title}`}
          className="size-full"
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs font-medium text-ink-70 underline underline-offset-2"
      >
        {t.hidePlayer}
      </button>
    </div>
  );
}
