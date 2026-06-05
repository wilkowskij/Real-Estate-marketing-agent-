/**
 * Playwright auth setup — logs in as a test user and stores the resulting
 * Supabase session cookies at e2e/.auth/state.json so all specs in the
 * "authenticated" project re-use the same session without re-logging in.
 *
 * Requires:
 *   TEST_USER_EMAIL    e.g. pw-test@example.com
 *   TEST_USER_PASSWORD e.g. PW_Test_2025!
 *
 * Create the test user once with:
 *   npx supabase functions invoke create-test-user  (or Supabase dashboard)
 */
import { test as setup, expect } from "@playwright/test";
import path from "path";

export const AUTH_STATE_FILE = path.join(__dirname, ".auth/state.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    console.warn(
      "[auth.setup] TEST_USER_EMAIL / TEST_USER_PASSWORD not set — " +
        "authenticated tests will be skipped."
    );
    // Write an empty state so dependent tests gracefully skip.
    await page.context().storageState({ path: AUTH_STATE_FILE });
    return;
  }

  await page.goto("/login");

  // AuthForm renders email + password fields — target by input type / label.
  await page.getByRole("textbox", { name: /email/i }).fill(email);
  await page.getByRole("textbox", { name: /password/i }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/(dashboard|profile)/, { timeout: 15_000 });

  await page.context().storageState({ path: AUTH_STATE_FILE });
});
