import { expect, test } from "@playwright/test";
import { MISSING_ADMIN, hasAdminCreds, login } from "./helpers";

test.describe("Auth", () => {
  test("unauthenticated visits are redirected to /login", async ({ page }) => {
    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(
      page.getByText("Sign in to track task progress."),
    ).toBeVisible();
  });

  test("invalid credentials show an error", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("nobody@example.com");
    await page.locator("#password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByRole("main").getByText("Invalid email or password."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin can sign in and sign out", async ({ page }) => {
    test.skip(!hasAdminCreds, MISSING_ADMIN);

    await login(page, "admin");
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
