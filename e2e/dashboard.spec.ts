import { expect, test } from "@playwright/test";
import {
  MISSING_ADMIN,
  fillExpectingUrl,
  hasAdminCreds,
  login,
} from "./helpers";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasAdminCreds, MISSING_ADMIN);
    await login(page, "admin");
  });

  test("renders KPIs, charts, member progress, and recent logs", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Metric cards
    for (const label of ["Total", "Pending", "In progress", "Overdue", "Completed", "Cancelled"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }

    // Charts
    await expect(page.getByText("Status breakdown")).toBeVisible();
    await expect(page.getByText("Tasks per brand")).toBeVisible();
    await expect(page.locator('[aria-label^="Status pie chart"]')).toBeVisible();
    await expect(
      page.locator('[aria-label="Overall progress"]').first(),
    ).toBeVisible();

    // Member progress table (includes the Overdue column)
    await expect(page.getByText("Member progress")).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Overdue" }).first(),
    ).toBeVisible();

    // Recent logs section
    await expect(page.getByText("Recent task logs")).toBeVisible();
  });

  test("month filter scopes stats and can be reset", async ({ page }) => {
    await page.goto("/dashboard");
    const monthInput = page.getByLabel("Filter dashboard by month");

    await fillExpectingUrl(page, monthInput, "2025-01", /month=2025-01/);
    await expect(page.getByRole("button", { name: "All time" })).toBeVisible();

    await page.getByRole("button", { name: "All time" }).click();
    await page.waitForURL(
      (url) => url.pathname === "/dashboard" && !url.searchParams.has("month"),
    );
  });
});
