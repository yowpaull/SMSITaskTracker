import { expect, test } from "@playwright/test";
import { MISSING_ADMIN, hasAdminCreds, login } from "./helpers";

test.describe("Profile", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasAdminCreds, MISSING_ADMIN);
    await login(page, "admin");
  });

  test("page renders both profile cards", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByText("Edit name")).toBeVisible();
    await expect(page.getByText("Change password").first()).toBeVisible();
    await expect(page.locator("#profile-full-name")).toBeVisible();
  });

  test("full name can be changed and restored", async ({ page }) => {
    await page.goto("/profile");
    const input = page.locator("#profile-full-name");
    const original = await input.inputValue();
    test.skip(!original, "Admin profile has no name on file");

    await input.fill(`${original} E2E`);
    await page.getByRole("button", { name: "Save name" }).click();
    await expect(page.getByText("Name updated.").first()).toBeVisible();

    await page.locator("#profile-full-name").fill(original);
    await page.getByRole("button", { name: "Save name" }).click();
    await expect(page.getByText("Name updated.").first()).toBeVisible();
    await expect(page.locator("#profile-full-name")).toHaveValue(original);
  });

  test("wrong current password is rejected", async ({ page }) => {
    await page.goto("/profile");
    await page.locator("#profile-current-password").fill("definitely-wrong-1");
    await page.locator("#profile-new-password").fill("Password123!");
    await page.locator("#profile-confirm-password").fill("Password123!");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(
      page.getByText("Your current password is incorrect.").first(),
    ).toBeVisible();
  });

  test("mismatched confirmation is rejected client-side", async ({ page }) => {
    await page.goto("/profile");
    await page.locator("#profile-current-password").fill("whatever-123");
    await page.locator("#profile-new-password").fill("Password123!");
    await page.locator("#profile-confirm-password").fill("Password12434!");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(
      page.getByText("New passwords do not match.").first(),
    ).toBeVisible();
  });
});
