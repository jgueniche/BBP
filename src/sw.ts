/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/turbopack/worker";
import type {
  PrecacheEntry,
  RuntimeCaching,
  SerwistGlobalConfig,
} from "serwist";
import { ExpirationPlugin, NetworkFirst, Serwist } from "serwist";

// `injectionPoint` (default "self.__SW_MANIFEST") is replaced by the precache
// manifest when the route handler bundles this file.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Recipes consulted recently stay readable offline (brief §10.14): both the
// HTML document and the RSC payload of /recettes/[slug] (+ cooking mode) and
// of the public /r/[slug] page, kept two weeks from last use.
const RECIPE_PATH = /^\/(?:recettes|r)\/[^/]+(?:\/cuisine)?$/;

const recipeCache: RuntimeCaching = {
  matcher: ({ request, url, sameOrigin }) =>
    sameOrigin &&
    RECIPE_PATH.test(url.pathname) &&
    (request.mode === "navigate" || request.headers.get("RSC") === "1"),
  handler: new NetworkFirst({
    cacheName: "bbp-recipes",
    networkTimeoutSeconds: 8,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 14 * 24 * 60 * 60,
        maxAgeFrom: "last-used",
      }),
    ],
  }),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [recipeCache, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// Web Push (session 12). Ported from the former public/sw.js: the worker URL
// changed to /serwist/sw.js but the scope stays "/", so the browser updates
// the existing registration in place and push subscriptions survive.
type PushPayload = { title?: string; body?: string; url?: string };

self.addEventListener("push", (event) => {
  let payload: PushPayload = {};
  try {
    payload = event.data ? (event.data.json() as PushPayload) : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "BBP";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/brand/png/icon-192.png",
      badge: "/brand/png/favicon-32.png",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data as { url?: string } | undefined;
  const url = data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windows) => {
        for (const client of windows) {
          if ("focus" in client) {
            await client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
