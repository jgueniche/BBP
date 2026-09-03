import { expect, test, type Page } from "@playwright/test";

import { fr } from "../src/i18n/fr";

// The service worker only registers on the production build (the provider
// is disabled in development), which is what `pnpm start` serves.

async function waitForServiceWorker(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    // The precache is filled during install: wait for the offline shell.
    for (let i = 0; i < 100; i += 1) {
      const cached = await caches.match("/~offline", { ignoreSearch: true });
      if (cached) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return registration.active?.scriptURL ?? "";
  });
}

test.describe("PWA shell", () => {
  test("exposes the manifest and registers the Serwist worker on scope /", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      /manifest\.webmanifest$/,
    );

    const scriptUrl = await waitForServiceWorker(page);
    expect(scriptUrl).toMatch(/\/serwist\/sw\.js$/);

    const scope = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration("/");
      return registration ? new URL(registration.scope).pathname : null;
    });
    expect(scope).toBe("/");
  });

  test("serves the offline shell when the network is gone", async ({
    page,
    context,
  }) => {
    await page.goto("/login");
    await waitForServiceWorker(page);

    await context.setOffline(true);
    // A page never visited: the document request fails and the worker
    // answers with the precached /~offline fallback.
    await page.goto("/journal", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: fr.pwa.offline.title }),
    ).toBeVisible();
    await context.setOffline(false);
  });

  test("keeps a keyboard skip link as the first focusable element", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: fr.a11y.skipToContent }),
    ).toBeFocused();
  });
});
