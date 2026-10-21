import { expect, test } from "@playwright/test";
import {
  MISSING_ADMIN,
  daysFromNow,
  hasAdminCreds,
  login,
  readLogTotal,
  trySelectOptionAt,
} from "./helpers";

test.describe("My tasks (admin)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasAdminCreds, MISSING_ADMIN);
    await login(page, "admin");
  });

  test("personal KPI cards, own-only list, no assignee filter", async ({
    page,
  }) => {
    // --- Create a log assigned to someone else ---
    await page.goto("/tasks/new");
    await expect(
      page.getByRole("heading", { name: "New task log" }),
    ).toBeVisible();
    test.skip(
      !(await trySelectOptionAt(page, "#main-category-select", 1)),
      "No active categories available",
    );
    test.skip(
      !(await trySelectOptionAt(page, "#sub-category-select", 1)),
      "No active subcategories available",
    );
    test.skip(
      !(await trySelectOptionAt(page, "#task-select", 1)),
      "No active tasks available",
    );
    test.skip(
      !(await trySelectOptionAt(page, "#brand-select", 1)),
      "No active brands available",
    );

    await page.locator("#assignee-select").click();
    const otherOption = page.getByRole("option", { name: /^E2E/ }).first();
    try {
      await expect(otherOption).toBeVisible({ timeout: 5_000 });
    } catch {
      await page.keyboard.press("Escape");
      test.skip(true, "No E2E member to assign");
    }
    await otherOption.click();

    await page.locator("#deadline").fill(daysFromNow(5));
    await page.getByRole("button", { name: "Create task log" }).click();
    await page.waitForURL(/\/tasks\?created=1/);

    // --- /tasks (all): the new log is the newest row ---
    const allTotal = await readLogTotal(page);
    expect(allTotal).toBeGreaterThan(0);
    await expect(page.getByRole("row").nth(1)).toBeVisible();

    // --- /my-tasks: KPI cards, no assignee filter, own-only list ---
    await page.goto("/my-tasks");
    await expect(page.getByRole("heading", { name: "My tasks" })).toBeVisible();
    await expect(
      page.locator('[aria-label="Overall progress"]').first(),
    ).toBeVisible();
    // The assignee filter only exists on the all-tasks view.
    await expect(page.getByText("All assignees")).toHaveCount(0);

    const myTotal = await readLogTotal(page);
    // The other-assigned log is not part of the personal list.
    expect(myTotal).toBeLessThan(allTotal);

    // --- Cleanup: delete the new log from /tasks (newest row first) ---
    await page.goto("/tasks");
    await page
      .getByRole("row")
      .nth(1)
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(page.getByText("Task log deleted.")).toBeVisible();
  });
});
