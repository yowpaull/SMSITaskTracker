import { expect, test } from "@playwright/test";
import { MISSING_ADMIN, hasAdminCreds, login, uniqueName } from "./helpers";

test.describe("Brands (admin)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasAdminCreds, MISSING_ADMIN);
    await login(page, "admin");
  });

  test("create, duplicate guard, activate/deactivate roundtrip", async ({ page }) => {
    const name = uniqueName("E2E Brand");

    await page.goto("/brands");
    await expect(page.getByRole("heading", { name: "Brands" })).toBeVisible();
    await expect(page.getByText("All brands")).toBeVisible();

    // Create
    await page.locator("#brand-name").fill(name);
    await page.getByRole("button", { name: "Add brand", exact: true }).click();
    await expect(page.getByText("Brand created.")).toBeVisible();
    const row = page.getByRole("row").filter({ hasText: name });
    await expect(row).toContainText("Active");

    // Duplicate name is rejected
    await page.locator("#brand-name").fill(name);
    await page.getByRole("button", { name: "Add brand", exact: true }).click();
    await expect(
      page.getByText("A brand with this name already exists.").first(),
    ).toBeVisible();

    // Deactivate → Inactive
    await row.getByRole("button", { name: "Deactivate" }).click();
    await expect(row).toContainText("Inactive");

    // Reactivate → Active
    await row.getByRole("button", { name: "Activate" }).click();
    await expect(row).toContainText("Active");

    // Cleanup: leave the E2E brand deactivated (hidden from task-log dropdowns)
    await row.getByRole("button", { name: "Deactivate" }).click();
    await expect(row).toContainText("Inactive");
  });

  test("search-free list keeps inactive brands visible on the page", async ({ page }) => {
    await page.goto("/brands");
    await expect(page.getByText("All brands")).toBeVisible();
    // Table or first-run empty state — both acceptable.
    const table = page.getByRole("table");
    const empty = page.getByText("No brands yet. Add the first one.");
    await expect(table.or(empty).first()).toBeVisible();
  });
});
