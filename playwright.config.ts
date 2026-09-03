import { defineConfig, devices } from "@playwright/test";

// End-to-end checks against the production build (brief §10.14 DoD: the app
// shell answers offline). Run `pnpm build` first, then `pnpm test:e2e`.
// CHROME_PATH lets a preinstalled Chromium be used instead of Playwright's.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    ...devices["Pixel 7"],
    launchOptions: process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : undefined,
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm start",
        url: "http://localhost:3000/login",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
