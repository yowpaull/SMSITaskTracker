import { expect, test } from "@playwright/test";
import { MISSING_ADMIN, hasAdminCreds, login } from "./helpers";

test.describe("App shell", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasAdminCreds, MISSING_ADMIN);
    await login(page, "admin");
  });

  test("sidebar shows all links and marks the active page", async ({ page }) => {
    for (const name of [
      "Dashboard",
      "Tasks",
      "My Tasks",
      "Create Task",
      "Brands",
      "Departments",
      "Members",
    ]) {
      await expect(
        page.getByRole("link", { name, exact: true }),
      ).toBeVisible();
    }

    const tasksLink = page.getByRole("link", { name: "Tasks", exact: true });
    await tasksLink.click();
    await page.waitForURL(/\/tasks$/);
    // Base UI renders boolean state as an empty attribute when true.
    await expect(tasksLink).toHaveAttribute("data-active", "");
    expect(
      await page
        .getByRole("link", { name: "Dashboard", exact: true })
        .getAttribute("data-active"),
    ).toBeNull();
  });

  test("theme toggle switches and persists across reload", async ({ page }) => {
    const html = page.locator("html");
    const before = await html.getAttribute("class");

    await page
      .getByRole("button", { name: /Switch to (dark|light) mode/ })
      .click();
    const after = await html.getAttribute("class");
    expect(after).not.toBe(before);

    await page.reload();
    expect(await html.getAttribute("class")).toBe(after);

    // Restore the original preference for other tests.
    await page
      .getByRole("button", { name: /Switch to (dark|light) mode/ })
      .click();
  });

  test("mobile sidebar opens and closes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const close = page.getByRole("button", { name: "Close sidebar" });
    await expect(close).toBeHidden();

    await page.getByRole("button", { name: "Toggle Sidebar" }).click();
    await expect(close).toBeVisible();

    await close.click();
    await expect(close).toBeHidden();
  });
});
