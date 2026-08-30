"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { joinCollectionByToken } from "@/app/(app)/recettes/collection-actions";
import { fr } from "@/i18n/fr";

const t = fr.recettes.collections;

export function JoinCollectionClient({ token }: { token: string }) {
  const router = useRouter();
  const attempted = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    joinCollectionByToken(token)
      .then((result) => {
        if (result.ok) {
          toast(t.joined);
          router.replace(`/recettes/carnets/${result.collectionId}`);
        } else {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
  }, [token, router]);

  return <p className="text-sm text-ink-70">{failed ? t.joinFailed : "…"}</p>;
}
