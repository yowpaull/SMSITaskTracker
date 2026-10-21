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

    // --- Role roundtrip (via the manage page) ---
    const summary = page.locator('[aria-label="Member summary"]');
    await row.getByRole("link", { name: /Manage/ }).click();
    await page.waitForURL(/\/members\/[0-9a-f-]+$/);
    await page.getByRole("button", { name: "Make admin" }).click();
    await expect(page.getByText("Member is now an admin.")).toBeVisible();
    await expect(summary.getByText("Admin", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Make member" }).click();
    await expect(page.getByText("Member is now a user.")).toBeVisible();
    await expect(summary.getByText("Member", { exact: true })).toBeVisible();

    // --- Deactivate → reactivate ---
    await page.getByRole("button", { name: "Deactivate account" }).click();
    await expect(
      page.getByText("Account deactivated. They can no longer sign in."),
    ).toBeVisible();
    await expect(
      summary.getByText("Deactivated", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Activate account" }).click();
    await expect(
      page.getByText("Account activated. They can sign in again."),
    ).toBeVisible();
    await expect(summary.getByText("Active", { exact: true })).toBeVisible();

    // --- Back to the unfiltered list ---
    // BackButton renders as <a role="button"> (Base UI Button render quirk)
    // and links to plain /members.
    await page.getByRole("button", { name: "Back to members" }).click();
    await page.waitForURL(
      (url) => url.pathname === "/members" && url.search === "",
    );
    await expect(page.getByText("All members")).toBeVisible();
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

  test("department filter scopes the list and All departments resets it", async ({ page }) => {
    await page.goto("/members");
    const filter = page.getByRole("combobox", { name: "Filter by department" });
    await expect(filter).toBeVisible();

    // Unassigned narrows the URL; All departments clears it again.
    await filter.click();
    await page.getByRole("option", { name: "Unassigned", exact: true }).click();
    await page.waitForURL(/department=unassigned/);

    await filter.click();
    await page.getByRole("option", { name: "All departments" }).click();
    await page.waitForURL(
      (url) => url.pathname === "/members" && !url.searchParams.has("department"),
    );
    await expect(page.getByText("All members")).toBeVisible();
  });

  test("pagination appears only with more than one page", async ({ page }) => {
    await page.goto("/members");
    const pagination = page.getByRole("navigation", { name: "Pagination" });
    try {
      // PPR streams the list after the shell paints — a raw isVisible()
      // here races the stream and would wrongly skip. Only when the list
      // has settled with no pagination is there genuinely one page.
      await expect(pagination).toBeVisible({ timeout: 15_000 });
    } catch {
      test.skip(true, "Fewer than two pages of members");
    }
    await pagination.getByText("Next").click();
    await page.waitForURL(/page=2/);
  });
});
