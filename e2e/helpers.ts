import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
export const memberEmail = process.env.E2E_MEMBER_EMAIL;
export const memberPassword = process.env.E2E_MEMBER_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

export const hasAdminCreds = Boolean(adminEmail && adminPassword);
export const hasMemberCreds = Boolean(memberEmail && memberPassword);
/** Service key present in the test process and not a publishable key. */
export const hasSecretKey = Boolean(
  supabaseUrl && secretKey && !secretKey.startsWith("sb_publishable_"),
);
export const MISSING_ADMIN =
  "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set in .env.local";
export const MISSING_MEMBER =
  "E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD not set in .env.local";
export const MISSING_SECRET_KEY =
  "SUPABASE_SECRET_KEY not set (or set to a publishable key) in .env.local";

/** UI login; resolves once the app lands on an authed page. */
export async function login(page: Page, role: "admin" | "member") {
  const email = role === "admin" ? adminEmail! : memberEmail!;
  const password = role === "admin" ? adminPassword! : memberPassword!;
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Admin lands on /dashboard; members get bounced to /tasks.
  await page.waitForURL(/\/(dashboard|tasks)/, { timeout: 20_000 });
}

/** Timestamped name so every run creates its own data. */
export function uniqueName(prefix: string) {
  return `${prefix} ${Date.now()}${Math.floor(Math.random() * 90 + 10)}`;
}

function adminAuth() {
  if (!supabaseUrl || !secretKey || secretKey.startsWith("sb_publishable_")) {
    throw new Error(MISSING_SECRET_KEY);
  }
  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Mint a recovery link server-side without sending email. `hash` is the
 * token_hash the /auth/confirm route exchanges for a session.
 */
export async function adminGenerateRecoveryHash(
  email: string,
): Promise<{ hash: string; userId: string }> {
  const { data, error } = await adminAuth().auth.admin.generateLink({
    type: "recovery",
    email,
  });
  if (error || !data) {
    throw new Error(`generateLink failed: ${error?.message ?? "no data"}`);
  }
  return { hash: data.properties.hashed_token, userId: data.user.id };
}

/** Force-set a user's password; used to restore fixtures after E2E. */
export async function adminSetPassword(userId: string, password: string) {
  const { error } = await adminAuth().auth.admin.updateUserById(userId, {
    password,
  });
  if (error) {
    throw new Error(`updateUserById failed: ${error.message}`);
  }
}

/** Password-grant probe: true when the email/password pair is accepted. */
export async function canSignIn(email: string, password: string) {
  if (!supabaseUrl || !publishableKey) return false;
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  return res.ok;
}

/** YYYY-MM-DD, `days` from today (UTC). */
export function daysFromNow(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Parse "Showing x–y of N logs" on /tasks; 0 when the list is empty. */
export async function readLogTotal(page: Page): Promise<number> {
  // Wait for the streamed list (PPR) — a cold read right after goto can
  // race the stream and wrongly return 0.
  await expect(
    page
      .getByText(/of \d+ logs?|No task logs found/)
      .first(),
  ).toBeVisible({ timeout: 15_000 });
  const text = await page
    .getByText(/of \d+ logs?/)
    .textContent()
    .catch(() => null);
  const match = text?.match(/of (\d+) logs?/);
  return match ? Number(match[1]) : 0;
}

/**
 * Open the select with the given element id and pick the option at `index`
 * (0 = placeholder). Returns false when no real option exists.
 */
export async function trySelectOptionAt(
  page: Page,
  id: string,
  index: number,
): Promise<boolean> {
  const selector = id.startsWith("#") ? id : `#${id}`;
  try {
    await page.locator(selector).waitFor({ state: "attached", timeout: 5_000 });
    await page.locator(selector).click();
  } catch {
    // Select never rendered (no active definitions) — no option to pick.
    return false;
  }
  // Scope to visible options: closed or reloading popups leave hidden
  // option nodes in the DOM that count() would include and click() would
  // hang on. Wait out the async popup render before deciding.
  const visible = page.locator('[role="option"]:visible');
  try {
    await expect(visible.first()).toBeVisible({ timeout: 8_000 });
  } catch {
    await page.keyboard.press("Escape");
    return false;
  }
  const count = await visible.count();
  if (count <= index) {
    await page.keyboard.press("Escape");
    return false;
  }
  try {
    await visible.nth(index).click({ timeout: 10_000 });
    return true;
  } catch {
    // The popup can close itself (stream/re-render race) between the
    // visibility check and the click. Close any half-open popup, reopen,
    // and pick once more before giving up.
    await page.keyboard.press("Escape");
    await page.locator(selector).click();
    try {
      await expect(visible.first()).toBeVisible({ timeout: 8_000 });
      await visible.nth(index).click();
      return true;
    } catch {
      await page.keyboard.press("Escape");
      throw new Error(`Select popup for ${selector} would not stay open`);
    }
  }
}

/**
 * Pick an option from a select whose trigger displays `triggerText`.
 * Triggers render with an empty accessible name, so match by content.
 */
export async function selectByTriggerText(
  page: Page,
  triggerText: string,
  optionName: string,
) {
  await page
    .getByRole("combobox")
    .filter({ hasText: triggerText })
    .click();
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

/**
 * Fill an input whose onChange drives router.replace, retrying once in case
 * the fill landed before React hydration attached its handlers.
 */
export async function fillExpectingUrl(
  page: Page,
  locator: ReturnType<Page["getByLabel"]>,
  value: string,
  pattern: RegExp,
) {
  await locator.fill(value);
  try {
    await page.waitForURL(pattern, { timeout: 5_000 });
  } catch {
    await locator.fill("");
    await locator.fill(value);
    await page.waitForURL(pattern, { timeout: 20_000 });
  }
}
