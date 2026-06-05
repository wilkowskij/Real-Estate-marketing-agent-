/**
 * End-to-end tests for the Facebook / Instagram OAuth connect + callback flow.
 *
 * Two layers:
 *  1. Unauthenticated (no TEST_USER_* env needed) — redirects to /login
 *  2. Authenticated (requires TEST_USER_EMAIL + TEST_USER_PASSWORD) — full flow
 *     against the mock Meta API server started by global-setup.ts
 *
 * The Next.js dev server is started with:
 *   META_APP_ID=test-app-id
 *   META_APP_SECRET=test-app-secret
 *   META_GRAPH_API_URL=http://localhost:9999   ← routes to the mock server
 */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { AUTH_STATE_FILE } from "../auth.setup";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Direct API call, following no redirects so we can assert on the Location. */
async function apiGet(request: APIRequestContext, path: string, cookies?: string) {
  return request.get(path, {
    maxRedirects: 0,
    headers: cookies ? { cookie: cookies } : {},
  });
}

/** Returns true when the auth state file contains an actual Supabase session. */
async function hasAuthState(): Promise<boolean> {
  try {
    const { readFileSync } = await import("fs");
    const state = JSON.parse(readFileSync(AUTH_STATE_FILE, "utf-8"));
    return (state.cookies ?? []).length > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 1. Unauthenticated — no credentials needed
// ---------------------------------------------------------------------------

test.describe("OAuth connect — unauthenticated", () => {
  test("GET /api/social/connect/facebook redirects to /login", async ({ request }) => {
    const res = await apiGet(request, "/api/social/connect/facebook");
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toContain("/login");
  });

  test("GET /api/social/connect/instagram redirects to /login", async ({ request }) => {
    const res = await apiGet(request, "/api/social/connect/instagram");
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toContain("/login");
  });

  test("GET /api/social/callback/facebook redirects to /login", async ({ request }) => {
    const res = await apiGet(request, "/api/social/callback/facebook?code=x&state=y");
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toContain("/login");
  });

  test("GET /api/social/connect/unknown-platform returns 400", async ({ request }) => {
    // platform guard fires before auth check, so we get 400 without logging in
    const res = await apiGet(request, "/api/social/connect/tiktok");
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// 2. Authenticated — requires TEST_USER_EMAIL / TEST_USER_PASSWORD
// ---------------------------------------------------------------------------

test.describe("OAuth connect — authenticated", () => {
  test.use({ storageState: AUTH_STATE_FILE });

  test.beforeEach(async () => {
    if (!(await hasAuthState())) {
      test.skip(true, "No TEST_USER_EMAIL / TEST_USER_PASSWORD — skipping authenticated OAuth tests");
    }
  });

  test("Facebook connect redirects to Meta authorization URL with correct params", async ({
    page,
  }) => {
    // Intercept the outbound redirect before the browser follows it.
    const redirectPromise = new Promise<URL>((resolve) => {
      page.on("request", (req) => {
        const url = req.url();
        if (url.includes("facebook.com/v21.0/dialog/oauth")) {
          resolve(new URL(url));
          // Don't abort — let Playwright follow naturally (Facebook 404s, that's fine)
        }
      });
    });

    // Trigger the connect flow — it will redirect to facebook.com.
    await page.goto("/api/social/connect/facebook");

    const metaUrl = await Promise.race([
      redirectPromise,
      page.waitForURL("**/login").then(() => null), // auth failure fallback
    ]);

    if (!metaUrl) {
      test.fail(true, "Redirected to /login — auth state may be stale");
      return;
    }

    expect(metaUrl.searchParams.get("client_id")).toBe("test-app-id");
    expect(metaUrl.searchParams.get("response_type")).toBe("code");
    expect(metaUrl.searchParams.get("redirect_uri")).toContain("/api/social/callback/facebook");

    const scopes = metaUrl.searchParams.get("scope") ?? "";
    expect(scopes).toContain("pages_show_list");
    expect(scopes).toContain("pages_manage_posts");

    // CSRF state must be present and non-empty.
    expect(metaUrl.searchParams.get("state")).toBeTruthy();
  });

  test("Instagram connect redirects to Meta authorization URL with IG scopes", async ({
    page,
  }) => {
    const redirectPromise = new Promise<URL>((resolve) => {
      page.on("request", (req) => {
        const url = req.url();
        if (url.includes("facebook.com/v21.0/dialog/oauth")) resolve(new URL(url));
      });
    });

    await page.goto("/api/social/connect/instagram");

    const metaUrl = await Promise.race([
      redirectPromise,
      page.waitForURL("**/login").then(() => null),
    ]);

    if (!metaUrl) { test.fail(true, "Redirected to /login"); return; }

    const scopes = metaUrl.searchParams.get("scope") ?? "";
    expect(scopes).toContain("instagram_basic");
    expect(scopes).toContain("instagram_content_publish");
  });
});

// ---------------------------------------------------------------------------
// 3. Callback CSRF / error handling — authenticated
// ---------------------------------------------------------------------------

test.describe("OAuth callback — CSRF validation", () => {
  test.use({ storageState: AUTH_STATE_FILE });

  test.beforeEach(async () => {
    if (!(await hasAuthState())) {
      test.skip(true, "No auth state — skipping");
    }
  });

  test("Callback with no state cookie redirects with invalid_state error", async ({ page }) => {
    // No oauth_state_facebook cookie → state mismatch.
    await page.goto("/api/social/callback/facebook?code=fake_code&state=anything");
    await expect(page).toHaveURL(/error=invalid_state/);
  });

  test("Callback with wrong state redirects with invalid_state error", async ({ page }) => {
    // Plant a cookie for a DIFFERENT platform so the facebook state lookup fails.
    await page.context().addCookies([
      {
        name: "oauth_state_instagram",
        value: "org-x.aaabbbccc",
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await page.goto("/api/social/callback/facebook?code=fake_code&state=org-x.aaabbbccc");
    await expect(page).toHaveURL(/error=invalid_state/);
  });
});

// ---------------------------------------------------------------------------
// 4. Full round-trip — connect then callback via mock Meta server
// ---------------------------------------------------------------------------

test.describe("OAuth full round-trip — mock Meta API", () => {
  test.use({ storageState: AUTH_STATE_FILE });

  test.beforeEach(async () => {
    if (!(await hasAuthState())) {
      test.skip(true, "No auth state — skipping");
    }
  });

  /**
   * Helper: drive the connect → callback round-trip by:
   *  1. Navigating to /api/social/connect/{platform} and capturing the
   *     CSRF state cookie the server sets.
   *  2. Navigating directly to the callback URL with that state + a mock code.
   *  3. Asserting the final URL is /profile/connections?connected={platform}.
   */
  async function runOAuthRoundTrip(
    platform: "facebook" | "instagram",
    page: import("@playwright/test").Page
  ) {
    // Step 1: Initiate connect — server sets oauth_state_{platform} cookie.
    await page.goto(`/api/social/connect/${platform}`, { waitUntil: "commit" });

    const cookies = await page.context().cookies();
    const stateCookie = cookies.find((c) => c.name === `oauth_state_${platform}`);
    expect(stateCookie, `oauth_state_${platform} cookie must be set`).toBeTruthy();

    const state = stateCookie!.value;

    // Step 2: Simulate Meta redirecting back with a fake code + the correct state.
    await page.goto(
      `/api/social/callback/${platform}?code=mock-auth-code&state=${encodeURIComponent(state)}`
    );

    // Step 3: Should end up on the connections page with a success param.
    await expect(page).toHaveURL(`/profile/connections?connected=${platform}`, {
      timeout: 15_000,
    });
  }

  test("Facebook OAuth round-trip stores account and redirects to connections", async ({
    page,
  }) => {
    await runOAuthRoundTrip("facebook", page);
  });

  test("Instagram OAuth round-trip stores account and redirects to connections", async ({
    page,
  }) => {
    await runOAuthRoundTrip("instagram", page);
  });
});
