import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { createSerwistRoute } from "@serwist/turbopack";

/**
 * Revision used to version the precached offline shell. Vercel exposes the
 * commit SHA at build time; local builds fall back to git, then to a UUID.
 */
function currentRevision(): string {
  const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA;
  if (fromVercel) return fromVercel;
  const git = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" });
  const sha = git.stdout?.trim();
  return sha && sha.length > 0 ? sha : randomUUID();
}

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/sw.ts",
    additionalPrecacheEntries: [
      { url: "/~offline", revision: currentRevision() },
    ],
    // The 1024 px logos are only used by the design page; keep the precache lean.
    globIgnores: ["**/node_modules/**/*", "public/brand/png/logo-*-1024.png"],
    useNativeEsbuild: true,
    // Next's browserslist reaches back to Safari 12, which esbuild 0.28 no
    // longer lowers; module service workers need modern engines anyway.
    esbuildOptions: { target: "es2020" },
  });
