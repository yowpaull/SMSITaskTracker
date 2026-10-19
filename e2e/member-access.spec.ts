import { expect, test } from "@playwright/test";
import { MISSING_MEMBER, hasMemberCreds, login } from "./helpers";

test.describe("Member access (non-admin)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasMemberCreds, MISSING_MEMBER);
    await login(page, "member");
    // Members are bounced from /dashboard to /tasks.
    await page.waitForURL(/\/tasks/);
  });

  test("sidebar hides admin-only links", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Tasks", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Create Task", exact: true }),
    ).toBeVisible();
    for (const name of [
      "Dashboard",
      "My Tasks",
      "Brands",
      "Departments",
      "Members",
    ]) {
      await expect(
        page.getByRole("link", { name, exact: true }),
      ).toHaveCount(0);
    }
  });

  test("admin pages redirect members to /tasks", async ({ page }) => {
    for (const path of [
      "/dashboard",
      "/brands",
      "/departments",
      "/members",
      "/my-tasks",
    ]) {
      await page.goto(path);
      await page.waitForURL(/\/tasks/);
      expect(page.url()).not.toContain(path);
    }
  });

  test("members cannot open member manage pages", async ({ page }) => {
    await page.goto("/members/00000000-0000-0000-0000-000000000000");
    await page.waitForURL(/\/tasks/);
    expect(page.url()).not.toContain("/members/");
  });

  test("tasks page shows personal KPI cards for members", async ({ page }) => {
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await expect(
      page.locator('[aria-label="Overall progress"]').first(),
    ).toBeVisible();
    // The assignee filter is admin-only.
    await expect(page.getByRole("button", { name: "All assignees" })).toHaveCount(0);
  });

  test("members can open their profile", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByText("Change password").first()).toBeVisible();
  });
});
