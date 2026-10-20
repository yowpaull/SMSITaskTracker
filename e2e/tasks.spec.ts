import { expect, test } from "@playwright/test";
import {
  MISSING_ADMIN,
  daysFromNow,
  fillExpectingUrl,
  hasAdminCreds,
  login,
  readLogTotal,
  selectByTriggerText,
  trySelectOptionAt,
} from "./helpers";

test.describe("Tasks", () => {  test.beforeEach(async ({ page }) => {
    test.skip(!hasAdminCreds, MISSING_ADMIN);
    await login(page, "admin");
  });

  test("renders filters, actions, and table or empty state", async ({ page }) => {
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await expect(page.getByPlaceholder("Search tasks…")).toBeVisible();
    await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
    // Button-with-render-link ends up role="button" on an <a>.
    await expect(page.getByRole("button", { name: "New task log" })).toBeVisible();

    const table = page.getByRole("table");
    const empty = page.getByText("No task logs found");
    if (await table.isVisible()) {
      for (const col of ["Task", "Status", "Overdue", "Deadline", "Actions"]) {
        await expect(table.getByRole("columnheader", { name: col })).toBeVisible();
      }
      // Admins assign to others; members get personal KPI cards instead.
      await expect(page.getByLabel("Overall progress")).toHaveCount(0);
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test("search filters the list and clear resets it", async ({ page }) => {
    await page.goto("/tasks");
    const query = `e2e-no-match-${Date.now()}`;
    await page.getByPlaceholder("Search tasks…").fill(query);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.waitForURL(new RegExp(`q=${query}`));
    await expect(page.getByText("No task logs found")).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.waitForURL((url) => url.pathname === "/tasks" && url.search === "");
  });

  test("status filter updates the URL", async ({ page }) => {
    await page.goto("/tasks");
    await selectByTriggerText(page, "All statuses", "Completed");
    await page.waitForURL(/status=completed/);
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();
  });

  test("created-from date filter updates the URL", async ({ page }) => {
    await page.goto("/tasks");
    await fillExpectingUrl(
      page,
      page.getByLabel("Created from"),
      daysFromNow(-30),
      /from=\d{4}-\d{2}-\d{2}/,
    );
    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.waitForURL((url) => url.pathname === "/tasks" && url.search === "");
  });

  test("export dialog downloads an xlsx for the picked month", async ({ page }) => {
    await page.goto("/tasks");
    await page.getByRole("button", { name: "Export", exact: true }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Export to Excel")).toBeVisible();
    await expect(dialog.locator("#export-month")).not.toHaveValue("");

    const downloadPromise = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Export", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^task-logs-\d{4}-\d{2}\.xlsx$/);
  });

  test("create a task log, verify counts, then delete it", async ({ page }) => {
    await page.goto("/tasks");
    const before = await readLogTotal(page);

    await page.goto("/tasks/new");
    await expect(page.getByRole("heading", { name: "New task log" })).toBeVisible();

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

    await page.locator("#deadline").fill(daysFromNow(5));
    await page.getByRole("button", { name: "Create task log" }).click();
    await page.waitForURL(/\/tasks\?created=1/);

    await expect(page.getByText(new RegExp(`of ${before + 1} logs?`))).toBeVisible();

    // Newest log sorts first (created_at desc) — delete it again.
    const firstRow = page.getByRole("row").nth(1);
    await firstRow.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(page.getByText("Task log deleted.")).toBeVisible();

    if (before === 0) {
      await expect(page.getByText("No task logs found")).toBeVisible();
    } else {
      await expect(page.getByText(new RegExp(`of ${before} logs?`))).toBeVisible();
    }
  });

  test("view, edit (no-op save), and cancel flows", async ({ page }) => {
    // Hydration guard: these pages SSR-formatted dates (UTC). A server/client
    // mismatch (e.g. locale timezone drift) surfaces as a console error.
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto("/tasks");
    // Wait for the streamed table (PPR) before counting rows — a cold count
    // reads only the header and skips spuriously.
    await expect(
      page.getByText(/Showing \d+|No task logs found/).first(),
    ).toBeVisible();
    test.skip(
      (await page.getByRole("row").count()) < 2,
      "No task logs to open",
    );

    const firstRow = () => page.getByRole("row").nth(1);

    // View
    await firstRow().getByRole("button", { name: "View" }).click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]+/);
    await expect(page.getByRole("heading", { name: "Task log" })).toBeVisible();

    // Edit — re-pick the current status (no data change) and save.
    await page.goBack();
    await firstRow().getByRole("button", { name: "Edit" }).click();
    await page.waitForURL(/\/edit$/);
    await expect(page.getByRole("heading", { name: "Edit task log" })).toBeVisible();

    const statusTrigger = page.locator("#status-select");
    await expect(statusTrigger).toBeVisible();
    const current = (await statusTrigger.innerText()).trim();
    await statusTrigger.click();
    await page.getByRole("option", { name: current, exact: true }).click();

    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Task log updated.")).toBeVisible();

    // Cancel returns to the task list.
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForURL(/\/tasks/);

    await expect(page.locator("body")).toBeVisible();
    expect(
      consoleErrors.filter((text) => /hydrat|did not match/i.test(text)),
    ).toEqual([]);
  });

  test("cancel on the create page returns to the list", async ({ page }) => {
    await page.goto("/tasks/new");
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForURL(/\/tasks$/);
  });

  test("pagination navigates when more than one page exists", async ({ page }) => {
    await page.goto("/tasks");
    // PPR streams the dynamic list (total, pagination) after load — wait for
    // the count text before deciding whether a second page exists, otherwise
    // the visibility check races the stream and skips spuriously.
    await expect(page.getByText(/Showing \d+/).first()).toBeVisible();
    const pagination = page.getByRole("navigation", { name: "Pagination" });
    test.skip(!(await pagination.isVisible()), "Fewer than two pages of logs");

    await pagination.getByText("Next").click();
    await page.waitForURL(/page=2/);

    await page
      .getByRole("navigation", { name: "Pagination" })
      .getByText("Previous")
      .click();
    await page.waitForURL(
      (url) => url.pathname === "/tasks" && !url.searchParams.has("page"),
    );
  });
});
