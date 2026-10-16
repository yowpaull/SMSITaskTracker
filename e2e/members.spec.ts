import { expect, test } from "@playwright/test";
import { MISSING_ADMIN, hasAdminCreds, login } from "./helpers";

test.describe("Members (admin)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasAdminCreds, MISSING_ADMIN);
    await login(page, "admin");
  });

  test("create, search, role change, deactivate/reactivate, duplicate guard", async ({ page }) => {
    const stamp = Date.now();
    const email = `e2e-member-${stamp}@example.com`;
    const name = `E2E Member ${stamp}`;

    await page.goto("/members");
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
    await expect(page.getByText("All members")).toBeVisible();

    // --- Create ---
    await page.locator("#member-name").fill(name);
    await page.locator("#member-email").fill(email);
    await page.locator("#member-password").fill("Password123!");
    await page.getByRole("button", { name: "Create member" }).click();
    await expect(
      page.getByText("Member created. They can sign in now."),
    ).toBeVisible();

    // --- Duplicate email is rejected ---
    await page.locator("#member-name").fill(name);
    await page.locator("#member-email").fill(email);
    await page.locator("#member-password").fill("Password123!");
    await page.getByRole("button", { name: "Create member" }).click();
    await expect(page.getByText(/already|exists/i).first()).toBeVisible();

    // --- Search finds the new member ---
    await page.getByLabel("Search members").fill(email);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.waitForURL(/\/members\?q=/);
    const row = page.getByRole("row").filter({ hasText: email });
    await expect(row).toContainText(name);
    await expect(row.getByText("Member", { exact: true })).toBeVisible();

    // --- Role roundtrip ---
    await row.getByRole("button", { name: /Manage/ }).click();
    await page.getByRole("menuitem", { name: "Make admin" }).click();
    await expect(row.getByText("Admin", { exact: true })).toBeVisible();

    await row.getByRole("button", { name: /Manage/ }).click();
    await page.getByRole("menuitem", { name: "Make member" }).click();
    await expect(row.getByText("Member", { exact: true })).toBeVisible();

    // --- Deactivate → reactivate ---
    await row.getByRole("button", { name: /Manage/ }).click();
    await page.getByRole("menuitem", { name: "Deactivate account" }).click();
    await expect(row.getByText("Deactivated", { exact: true })).toBeVisible();

    await row.getByRole("button", { name: /Manage/ }).click();
    await page.getByRole("menuitem", { name: "Activate account" }).click();
    await expect(row.getByText("Active", { exact: true })).toBeVisible();

    // --- Clear the search ---
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/members" && url.search === "");
  });

  test("search with no matches shows a friendly message", async ({ page }) => {
    await page.goto("/members");
    const query = `e2e-nope-${Date.now()}`;
    await page.getByLabel("Search members").fill(query);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.waitForURL(new RegExp(`q=${query}`));
    await expect(page.getByText(/No members match/)).toBeVisible();
  });

  test("the admin's own row is not manageable", async ({ page }) => {
    const adminEmail = process.env.E2E_ADMIN_EMAIL!;
    await page.goto(`/members?q=${encodeURIComponent(adminEmail)}`);
    const row = page.getByRole("row").filter({ hasText: adminEmail });
    await expect(row).toBeVisible();
    await expect(row.getByText("It's you")).toBeVisible();
  });

  test("pagination appears only with more than one page", async ({ page }) => {
    await page.goto("/members");
    const pagination = page.getByRole("navigation", { name: "Pagination" });
    if (await pagination.isVisible()) {
      await pagination.getByText("Next").click();
      await page.waitForURL(/page=2/);
    } else {
      test.skip(true, "Fewer than two pages of members");
    }
  });
});
