import { expect, test } from "@playwright/test";
import {
  MISSING_MEMBER,
  MISSING_SECRET_KEY,
  adminGenerateRecoveryHash,
  adminSetPassword,
  canSignIn,
  hasMemberCreds,
  hasSecretKey,
  memberEmail,
  memberPassword,
} from "./helpers";

const GENERIC =
  "If an account for that email exists, a password reset link has been sent.";
const INVALID = "This reset link is invalid or has expired.";

test.describe("password recovery", () => {
  // The full flow swaps the shared member password; restore it after any
  // test that touched it so the rest of the suite keeps working.
  let passwordChanged = false;

  test.afterEach(async () => {
    if (!passwordChanged || !hasSecretKey || !memberEmail || !memberPassword) {
      return;
    }
    passwordChanged = false;
    const { userId } = await adminGenerateRecoveryHash(memberEmail);
    await adminSetPassword(userId, memberPassword);
    expect(
      await canSignIn(memberEmail, memberPassword),
      "member password restore failed",
    ).toBe(true);
  });

  test("unknown email gets the same generic response", async ({ page }) => {
    await page.goto("/forgot-password");
    await page
      .locator("#forgot-email")
      .fill(`nobody-${Date.now()}@example.invalid`);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(GENERIC).first()).toBeVisible();
    // Success replaces the form with the confirmation state.
    await expect(page.locator("form")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Back to sign in" }),
    ).toBeVisible();
  });

  test("signed-out visit to the reset page shows the invalid-link state", async ({
    page,
  }) => {
    await page.goto("/reset-password");
    await expect(page).toHaveURL(/\/reset-password/);
    await expect(page.getByText(INVALID).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Request a new link" }),
    ).toBeVisible();
  });

  test("a bogus recovery token bounces to the invalid-link state", async ({
    page,
  }) => {
    await page.goto(
      "/auth/confirm?token_hash=not-a-real-token-1234&type=recovery&next=/reset-password",
    );
    await expect(page).toHaveURL(/\/reset-password\?error=1/);
    await expect(page.getByText(INVALID).first()).toBeVisible();
  });

  test("login page links to the forgot-password form", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page.locator("#forgot-email")).toBeVisible();
  });

  test("full flow: request link, set new password, sign in with it", async ({
    page,
  }) => {
    test.skip(
      !hasMemberCreds || !hasSecretKey,
      `${MISSING_MEMBER} / ${MISSING_SECRET_KEY}`,
    );

    // 1) Request the reset through the UI — the response is always generic.
    await page.goto("/forgot-password");
    await page.locator("#forgot-email").fill(memberEmail!);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(GENERIC).first()).toBeVisible();

    // 2) Simulate the emailed link: mint the same token_hash GoTrue sends.
    const { hash } = await adminGenerateRecoveryHash(memberEmail!);
    await page.goto(
      `/auth/confirm?token_hash=${hash}&type=recovery&next=/reset-password`,
    );
    await expect(page).toHaveURL(/\/reset-password/);
    await expect(page.locator("#new-password")).toBeVisible({ timeout: 15_000 });

    const tempPassword = `Temp-${Date.now()}-Pw1`;
    await page.locator("#new-password").fill(tempPassword);
    await page.locator("#confirm-password").fill(tempPassword);
    passwordChanged = true; // afterEach restores even if the submit fails
    await page.getByRole("button", { name: "Update password" }).click();
    await page.waitForURL(/\/(dashboard|tasks)/, { timeout: 20_000 });

    // 3) Sign out and back in with the new password.
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/login/);
    await page.goto("/login");
    await page.locator("#email").fill(memberEmail!);
    await page.locator("#password").fill(tempPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/(dashboard|tasks)/, { timeout: 20_000 });
  });
});
