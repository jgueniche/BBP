import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

// Serwist (PWA, brief §10.14): the service worker is compiled by esbuild and
// served by the route handler in src/app/serwist/[path]/route.ts.
export default withSerwist(nextConfig);
