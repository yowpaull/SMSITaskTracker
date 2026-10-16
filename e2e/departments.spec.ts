import { expect, test } from "@playwright/test";
import { MISSING_ADMIN, hasAdminCreds, login, uniqueName } from "./helpers";

test.describe("Departments", () => {
  test.skip(!hasAdminCreds, MISSING_ADMIN);

  test("admin CRUD + head scoping + unassigned bucket", async ({ page }) => {
    test.setTimeout(180_000);
    const stamp = Date.now();
    const deptName = uniqueName("E2E Dept");
    const headEmail = `e2e-dept-head-${stamp}@example.com`;
    const headName = `E2E Dept Head ${stamp}`;
    const memberEmail = `e2e-dept-member-${stamp}@example.com`;
    const memberName = `E2E Dept Member ${stamp}`;
    const mateEmail = `e2e-dept-mate-${stamp}@example.com`;
    const mateName = `E2E Dept Mate ${stamp}`;
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
    await expect(page.getByText("Your department")).toBeVisible();
    await page.getByLabel("Search members").fill(memberEmail);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.waitForURL(/\/members\?q=/);
    await expect(page.getByText(/No members match/)).toBeVisible();

    // Head cannot open admin pages.
    await page.goto("/departments");
    await page.waitForURL(/\/tasks/);
    await page.goto("/brands");
    await page.waitForURL(/\/tasks/);

    // --- Cleanup: admin deactivates everything ---
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    await login(page, "admin");

    for (const email of [headEmail, mateEmail, memberEmail]) {
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
