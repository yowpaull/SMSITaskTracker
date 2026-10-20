import { expect, test } from "@playwright/test";
import {
  MISSING_ADMIN,
  daysFromNow,
  hasAdminCreds,
  login,
  trySelectOptionAt,
  uniqueName,
} from "./helpers";

test.describe("Departments", () => {
  test.skip(!hasAdminCreds, MISSING_ADMIN);

  test("admin CRUD + head scoping + unassigned bucket", async ({ page }) => {
    test.setTimeout(240_000);
    const stamp = Date.now();
    const deptName = uniqueName("E2E Dept");
    const headEmail = `e2e-dept-head-${stamp}@example.com`;
    const headName = `E2E Dept Head ${stamp}`;
    const memberEmail = `e2e-dept-member-${stamp}@example.com`;
    const memberName = `E2E Dept Member ${stamp}`;
    const mateEmail = `e2e-dept-mate-${stamp}@example.com`;
    const mateName = `E2E Dept Mate ${stamp}`;
    const childEmail = `e2e-dept-child-${stamp}@example.com`;
    const childName = `E2E Dept Child ${stamp}`;
    const password = "Password123!";

    // --- Admin: create the department ---
    await login(page, "admin");
    await page.goto("/departments");
    await expect(page.getByRole("heading", { name: "Departments" })).toBeVisible();
    await page.locator("#department-name").fill(deptName);
    await page.getByRole("button", { name: "Add department" }).click();
    await expect(page.getByText("Department created.")).toBeVisible();

    // --- Admin: create a head + a plain member (plain = Unassigned) ---
    const createdToast = page.getByText(
      "Member created. They can sign in now.",
    );
    await page.goto("/members");
    await page.locator("#member-name").fill(headName);
    await page.locator("#member-email").fill(headEmail);
    await page.locator("#member-password").fill(password);
    await page.locator("#member-department").click();
    await page.getByRole("option", { name: deptName, exact: true }).click();
    await page.getByRole("button", { name: "Create member" }).click();
    await expect(createdToast).toBeVisible();

    await createdToast.waitFor({ state: "detached" });
    await page.locator("#member-name").fill(memberName);
    await page.locator("#member-email").fill(memberEmail);
    await page.locator("#member-password").fill(password);
    await page.getByRole("button", { name: "Create member" }).click();
    await expect(createdToast).toBeVisible();

    // A third member inside the department, so the head has someone to manage.
    await createdToast.waitFor({ state: "detached" });
    await page.locator("#member-name").fill(mateName);
    await page.locator("#member-email").fill(mateEmail);
    await page.locator("#member-password").fill(password);
    await page.locator("#member-department").click();
    await page.getByRole("option", { name: deptName, exact: true }).click();
    await page.getByRole("button", { name: "Create member" }).click();
    await expect(
      page.getByText("Member created. They can sign in now."),
    ).toBeVisible();

    // --- Admin: promote the first member to head (via the manage page) ---
    await page.getByLabel("Search members").fill(headEmail);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.waitForURL(/\/members\?q=/);
    const headRow = page.getByRole("row").filter({ hasText: headEmail });
    await expect(headRow).toContainText(deptName);
    await headRow.getByRole("link", { name: /Manage/ }).click();
    await page.waitForURL(/\/members\/[0-9a-f-]+$/);
    await page.getByRole("button", { name: "Make head" }).click();
    await expect(
      page.getByText("Member is now a Department Head."),
    ).toBeVisible();
    await expect(
      page
        .locator('[aria-label="Member summary"]')
        .getByText("Head", { exact: true }),
    ).toBeVisible();

    // --- Admin: departments page shows the new department + head ---
    await page.goto("/departments");
    const deptRow = page.getByRole("row").filter({ hasText: deptName });
    await expect(deptRow).toContainText(headName);
    // Head + mate are in the department; the plain member stays Unassigned.
    await expect(
      deptRow.getByRole("cell", { name: "2", exact: true }),
    ).toBeVisible();

    // --- Admin: dashboard rollup includes the department + Unassigned ---
    await page.goto("/dashboard");
    await expect(
      page.getByText("Progress per department"),
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: deptName }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: "Unassigned" }).first(),
    ).toBeVisible();

    // --- Sign out; head signs in ---
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/login");
    await page.locator("#email").fill(headEmail);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });

    // Head dashboard: scoped view, no per-department rollup.
    await expect(
      page.getByText("Task progress for your department's members."),
    ).toBeVisible();
    await expect(page.getByText("Progress per department")).toHaveCount(0);

    // Head nav: no Brands/Departments links.
    await expect(
      page.getByRole("link", { name: "Members", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Brands", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Departments", exact: true }),
    ).toHaveCount(0);
    // Task definitions stay open for staff (admin + heads), not members.
    await expect(
      page.getByRole("link", { name: "Create Task", exact: true }),
    ).toBeVisible();

    // Head My Tasks: personal KPI cards and no assignee filter.
    await page.getByRole("link", { name: "My Tasks", exact: true }).click();
    await page.waitForURL(/\/my-tasks/);
    await expect(
      page.locator('[aria-label="Overall progress"]').first(),
    ).toBeVisible();
    await expect(page.getByText("All assignees")).toHaveCount(0);

    // Head can open the manage page of a member of their own department.
    await page.goto(`/members?q=${encodeURIComponent(mateEmail)}`);
    await page
      .getByRole("row")
      .filter({ hasText: mateEmail })
      .getByRole("link", { name: /Manage/ })
      .click();
    await page.waitForURL(/\/members\/[0-9a-f-]+$/);
    await expect(
      page.getByRole("button", { name: "Deactivate account" }),
    ).toBeVisible();
    // No role or department controls for heads.
    await expect(page.getByRole("button", { name: "Make admin" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Make head" })).toHaveCount(0);

    // Head members page: only their department; the unassigned member is invisible.
    await page.goto("/members");
    await expect(
      page.getByText("Your department", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("New members are added to your department."),
    ).toBeVisible();

    // Head can create a member, who lands in the head's own department.
    await page.locator("#member-name").fill(childName);
    await page.locator("#member-email").fill(childEmail);
    await page.locator("#member-password").fill(password);
    await page.getByRole("button", { name: "Create member" }).click();
    const childToast = page.getByText("Member created. They can sign in now.");
    await expect(childToast).toBeVisible();
    await childToast.waitFor({ state: "detached" });

    await page.getByLabel("Search members").fill(childEmail);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.waitForURL(/\/members\?q=/);
    const childRow = page.getByRole("row").filter({ hasText: childEmail });
    await expect(childRow).toContainText(deptName);
    await expect(childRow.getByText("Member", { exact: true })).toBeVisible();

    // The unassigned member stays invisible to the head.
    await page.getByLabel("Search members").fill(memberEmail);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.waitForURL(/\/members\?q=/);
    await expect(page.getByText(/No members match/)).toBeVisible();

    // Head cannot open admin pages.
    await page.goto("/departments");
    await page.waitForURL(/\/tasks/);
    await page.goto("/brands");
    await page.waitForURL(/\/tasks/);

    // --- Head deletes logs of their own members ---
    const createLogForMate = async () => {
      await page.goto("/tasks/new");
      await expect(
        page.getByRole("heading", { name: "New task log" }),
      ).toBeVisible();
      for (const id of [
        "#main-category-select",
        "#sub-category-select",
        "#task-select",
        "#brand-select",
      ]) {
        await trySelectOptionAt(page, id, 1);
      }
      await page.locator("#assignee-select").click();
      const mateOption = page.getByRole("option", {
        name: mateName,
        exact: true,
      });
      await expect(mateOption).toBeVisible();
      await mateOption.click();
      await page.locator("#deadline").fill(daysFromNow(5));
      await page.getByRole("button", { name: "Create task log" }).click();
      await page.waitForURL(/\/tasks\?created=1/);
      const row = page.getByRole("row").nth(1);
      await expect(row).toBeVisible();
      return (await row.locator("td").first().innerText()).trim();
    };

    // Create a member-assigned log and delete it as the head.
    await createLogForMate();
    const headLogRow = page.getByRole("row").nth(1);
    await headLogRow
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    const headDialog = page.getByRole("alertdialog");
    await expect(headDialog).toBeVisible();
    await headDialog
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(page.getByText("Task log deleted.")).toBeVisible();

    // Leave one more member-assigned log for the admin to delete below —
    // proof that admins can delete anyone's logs.
    await createLogForMate();

    // --- Cleanup: admin deactivates everything ---
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    await login(page, "admin");

    // Admin deletes the head-created member log (admins delete any log) —
    // the stray sorts first as the newest log.
    await page.goto("/tasks");
    const strayRow = page.getByRole("row").nth(1);
    await expect(strayRow).toBeVisible();
    await strayRow
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    const strayDialog = page.getByRole("alertdialog");
    await expect(strayDialog).toBeVisible();
    await strayDialog
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(page.getByText("Task log deleted.")).toBeVisible();

    for (const email of [headEmail, mateEmail, childEmail, memberEmail]) {
      await page.goto(`/members?q=${encodeURIComponent(email)}`);
      const row = page.getByRole("row").filter({ hasText: email });
      await row.getByRole("link", { name: /Manage/ }).click();
      await page.waitForURL(/\/members\/[0-9a-f-]+$/);
      await page.getByRole("button", { name: "Deactivate account" }).click();
      await expect(
        page
          .locator('[aria-label="Member summary"]')
          .getByText("Deactivated", { exact: true }),
      ).toBeVisible();
    }

    await page.goto("/departments");
    const cleanupRow = page
      .getByRole("row")
      .filter({ hasText: deptName });
    await cleanupRow.getByRole("button", { name: "Deactivate" }).click();
    await expect(cleanupRow.getByText("Inactive")).toBeVisible();
  });
});
