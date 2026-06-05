import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 *
 * Two test projects:
 *  - "setup"         — auth.setup.ts: logs in and stores cookies
 *  - "chromium"      — the rest of e2e/**\/*.spec.ts, depends on "setup"
 *
 * The Next.js dev server is started automatically with test credentials and
 * META_GRAPH_API_URL pointed at the mock Meta server (port 9999) launched
 * by global-setup.ts.
 *
 * Required env vars for authenticated tests:
 *   TEST_USER_EMAIL       Supabase test user email
 *   TEST_USER_PASSWORD    Supabase test user password
 *   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (already in .env.local)
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",

  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    // Auth setup runs first and stores cookies to e2e/.auth/state.json.
    {
      name: "setup",
      testMatch: "**/auth.setup.ts",
    },
    // All other specs depend on the auth setup.
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      // Fake Meta credentials — the mock server doesn't validate them.
      META_APP_ID: process.env.META_APP_ID ?? "test-app-id",
      META_APP_SECRET: process.env.META_APP_SECRET ?? "test-app-secret",
      // Route all Meta Graph API calls to the local mock server.
      META_GRAPH_API_URL: "http://localhost:9999",
      // 32-byte base64 key for token encryption (test-only value).
      SOCIAL_TOKEN_ENC_KEY:
        process.env.SOCIAL_TOKEN_ENC_KEY ??
        Buffer.alloc(32, "playwright-test").toString("base64"),
    },
  },
});
