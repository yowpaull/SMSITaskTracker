import { expect, test } from "@playwright/test";
import {
  MISSING_ADMIN,
  MISSING_MEMBER,
  daysFromNow,
  hasAdminCreds,
  hasMemberCreds,
  login,
  memberEmail,
  trySelectOptionAt,
} from "./helpers";

test.describe("Member task-log restrictions", () => {
  test.beforeEach(() => {
    test.skip(
      !hasAdminCreds || !hasMemberCreds,
      `${MISSING_ADMIN} / ${MISSING_MEMBER}`,
    );
  });

  test(
    "member may only change status, cannot delete; self-create stays",
    async ({ page }) => {
      test.setTimeout(180_000);

      // --- Admin: create a log assigned to the E2E member ---
      await login(page, "admin");

      // Assignee options show full_name (fallback email) — resolve the
      // member's display name so we hit the right option exactly. Match the
      // email as an exact cell: substring matching would also hit other
      // accounts whose email merely contains this one (e.g. jpaul@…).
      await page.goto(`/members?q=${encodeURIComponent(memberEmail!)}`);
      const memberTableRow = page
        .getByRole("row")
        .filter({
          has: page.getByRole("cell", { name: memberEmail!, exact: true }),
        })
        .first();
      await expect(memberTableRow).toBeVisible();
      const memberName = (
        await memberTableRow.locator("td").first().innerText()
      )
        .trim();
      expect(memberName.length).toBeGreaterThan(0);

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
      const memberOption = page.getByRole("option", {
        name: memberName,
        exact: true,
      });
      // Also waits out the async popup render — an instant count() here can
      // race the open, and clicking into a closed popup hangs.
      try {
        await expect(memberOption).toBeVisible({ timeout: 5_000 });
      } catch {
        await page.keyboard.press("Escape");
        test.skip(true, `Assignee option "${memberName}" not found`);
      }
      await memberOption.click();

      const deadline = daysFromNow(5);
      await page.locator("#deadline").fill(deadline);
      await page.getByRole("button", { name: "Create task log" }).click();
      await page.waitForURL(/\/tasks\?created=1/);

      // Identify the new row by task name for a reliable cleanup later.
      const createdRow = page.getByRole("row").nth(1);
      await expect(createdRow).toBeVisible();
      const taskName = (await createdRow.locator("td").first().innerText())
        .trim()
        .toLowerCase();
      expect(taskName.length).toBeGreaterThan(0);

      // --- Member: sign out admin, sign in as member ---
      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(/\/login/);
      await login(page, "member");

      // The assigned log is visible, but without any Delete affordance.
      await page.goto("/tasks");
      await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Delete", exact: true }),
      ).toHaveCount(0);
      const memberRow = page.getByRole("row").nth(1);
      await expect(
        memberRow.getByRole("button", { name: "View" }),
      ).toBeVisible();
      await expect(
        memberRow.getByRole("button", { name: "Edit" }),
      ).toBeVisible();

      // Self-created logs stay allowed — but the assignee is not shown.
      await page.goto("/tasks/new");
      await expect(
        page.getByRole("heading", { name: "New task log" }),
      ).toBeVisible();
      await expect(page.locator("#assignee-select")).toHaveCount(0);
      await expect(page.locator("#deadline")).toBeVisible();

      // --- Status-only edit ---
      await page.goto("/tasks");
      await page
        .getByRole("row")
        .nth(1)
        .getByRole("button", { name: "Edit" })
        .click();
      await page.waitForURL(/\/tasks\/[0-9a-f-]+\/edit/);
      const logId = new URL(page.url()).pathname.split("/")[2];
      await expect(
        page.getByText(
          "Update the status of this task log. All other fields are locked.",
        ),
      ).toBeVisible();
      await expect(page.locator("#status-select")).toBeVisible();
      // Everything except status is locked away.
      for (const id of [
        "#main-category-select",
        "#sub-category-select",
        "#task-select",
        "#brand-select",
        "#assignee-select",
        "#deadline",
      ]) {
        await expect(page.locator(id)).toHaveCount(0);
      }
      await expect(page.locator("#urgent")).toHaveCount(0);
      await expect(page.locator("#important")).toHaveCount(0);

      await page.locator("#status-select").click();
      const inProgressOption = page.getByRole("option", {
        name: "In progress",
      });
      await expect(inProgressOption).toBeVisible();
      await inProgressOption.click();
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByText("Task log updated.")).toBeVisible();

      // --- Verify: status changed, every other field untouched ---
      await page.goto("/tasks");
      const updatedRow = page.getByRole("row").nth(1);
      await expect(updatedRow.getByText("In progress")).toBeVisible();
      const expectedDeadline = new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(`${deadline}T00:00:00Z`));
      // Full page load (not a client nav) so no hidden /tasks DOM collides
      // with the date text below.
      await page.goto(`/tasks/${logId}`);
      await expect(
        page.getByRole("heading", { name: "Task log" }),
      ).toBeVisible();
      await expect(
        page.getByText(expectedDeadline, { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("In progress").first()).toBeVisible();

      // --- Cleanup: admin deletes the log again ---
      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(/\/login/);
      await login(page, "admin");
      await page.goto("/tasks");
      const cleanupRow = page
        .getByRole("row")
        .filter({ hasText: taskName })
        .first();
      await expect(cleanupRow).toBeVisible();
      await cleanupRow
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      const confirmDialog = page.getByRole("alertdialog");
      await expect(confirmDialog).toBeVisible();
      await confirmDialog
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect(page.getByText("Task log deleted.")).toBeVisible();
    },
  );
});
