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
          "Update the status or remarks of this task log. All other fields are locked.",
        ),
      ).toBeVisible();
      await expect(page.locator("#status-select")).toBeVisible();
      // Everything except status and remarks is locked away.
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
      // Remarks is the member's second editable field, with a live counter.
      await expect(page.locator("#remarks")).toBeVisible();
      await expect(page.locator("#remarks-letter-count")).toHaveText(
        "0 / 1000 letters",
      );

      // The limit counts letters (characters) exactly — a bare URL counts
      // every one of its characters, not one token per line.
      await page
        .locator("#remarks")
        .fill("https://drive.google.com/drive/u/2/home");
      await expect(page.locator("#remarks-letter-count")).toHaveText(
        "39 / 1000 letters",
      );

      // --- Letter limit: the input itself hard-blocks past the cap -----
      await expect(page.locator("#remarks")).toHaveAttribute(
        "maxlength",
        "1000",
      );

      // Over-cap input is truncated by maxLength: value, counter, and the
      // enabled state all stop exactly at the cap.
      await page.locator("#remarks").fill("x".repeat(1001));
      expect(
        await page
          .locator("#remarks")
          .evaluate((el) => (el as HTMLTextAreaElement).value.length),
      ).toBe(1000);
      await expect(page.locator("#remarks-letter-count")).toHaveText(
        "1000 / 1000 letters",
      );
      await expect(
        page.getByRole("button", { name: "Save changes" }),
      ).toBeEnabled();

      // The auto-growing (field-sizing-content) box stops at max-h-48 and
      // scrolls instead of stretching the form.
      await page
        .locator("#remarks")
        .fill(Array.from({ length: 500 }, () => "x").join("\n"));
      await expect
        .poll(() => page.locator("#remarks").evaluate((el) => el.clientHeight))
        .toBeLessThanOrEqual(200);
      expect(
        await page
          .locator("#remarks")
          .evaluate((el) => el.scrollHeight > el.clientHeight),
      ).toBe(true);

      // A programmatic value that bypasses maxLength still trips the
      // safety net: the counter turns red and saving is blocked.
      await page
        .locator("#remarks")
        .evaluate((el) => el.removeAttribute("maxlength"));
      const overLimitLetters = Array.from(
        { length: 501 },
        () => "x",
      ).join("\n");
      await page.locator("#remarks").fill(overLimitLetters);
      await page
        .locator("#remarks")
        .evaluate((el) => el.setAttribute("maxlength", "1000"));
      await expect(page.locator("#remarks-letter-count")).toHaveText(
        "1001 / 1000 letters",
      );
      await expect(
        page.getByRole("button", { name: "Save changes" }),
      ).toBeDisabled();

      const atLimitLetters = "x".repeat(1000);
      await page.locator("#remarks").fill(atLimitLetters);
      await expect(page.locator("#remarks-letter-count")).toHaveText(
        "1000 / 1000 letters",
      );
      await expect(
        page.getByRole("button", { name: "Save changes" }),
      ).toBeEnabled();

      // The remark that actually gets saved (includes a link).
      await page
        .locator("#remarks")
        .fill("See https://example.com/spec for the full spec.");
      await expect(page.locator("#remarks-letter-count")).toHaveText(
        "47 / 1000 letters",
      );

      await page.locator("#status-select").click();
      const inProgressOption = page.getByRole("option", {
        name: "In progress",
      });
      await expect(inProgressOption).toBeVisible();
      await inProgressOption.click();
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByText("Task log updated.")).toBeVisible();

      // --- Verify: status + remarks changed, every other field untouched ---
      await page.goto("/tasks");
      const updatedRow = page.getByRole("row").nth(1);
      await expect(updatedRow.getByText("In progress")).toBeVisible();
      await expect(
        updatedRow.getByRole("link", { name: "https://example.com/spec" }),
      ).toBeVisible();
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
      // Remarks render as pre-wrapped, linkified text on the view page.
      await expect(
        page.getByRole("link", { name: "https://example.com/spec" }),
      ).toBeVisible();
      await expect(
        page.getByText("See https://example.com/spec").first(),
      ).toBeVisible();

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
