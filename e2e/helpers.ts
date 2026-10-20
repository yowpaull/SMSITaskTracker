import { expect, type Page } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
export const memberEmail = process.env.E2E_MEMBER_EMAIL;
const memberPassword = process.env.E2E_MEMBER_PASSWORD;

export const hasAdminCreds = Boolean(adminEmail && adminPassword);
export const hasMemberCreds = Boolean(memberEmail && memberPassword);
export const MISSING_ADMIN =
  "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set in .env.local";
export const MISSING_MEMBER =
  "E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD not set in .env.local";

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
  await page.locator(selector).click();
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
  await visible.nth(index).click();
  return true;
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
