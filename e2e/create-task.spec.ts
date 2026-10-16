import { expect, test } from "@playwright/test";
import { MISSING_ADMIN, hasAdminCreds, login, uniqueName } from "./helpers";

test.describe("Create Task page (definitions)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasAdminCreds, MISSING_ADMIN);
    await login(page, "admin");
  });

  test("category → subcategory → task lifecycle", async ({ page }) => {
    const categoryName = uniqueName("E2E Category");
    const subcategoryName = uniqueName("E2E Subcategory");
    const taskName = uniqueName("E2E Task");
    const renamedCategory = `${categoryName} Renamed`;
    const renamedTask = `${taskName} Edited`;

    await page.goto("/create-task");
    await expect(page.getByRole("heading", { name: "Create Task" })).toBeVisible();
    await expect(page.getByText("Categories", { exact: true })).toBeVisible();

    // --- Create a main category ---
    await page.getByRole("button", { name: "Add category", exact: true }).click();
    const addDialog = page.getByRole("dialog");
    await addDialog.locator("#category-name").fill(categoryName);
    await addDialog.getByRole("button", { name: "Add category", exact: true }).click();
    await expect(page.getByText("Category created.")).toBeVisible();

    // Expand the new category in the accordion.
    const categoryTrigger = page
      .getByRole("button")
      .filter({ hasText: categoryName })
      .first();
    await categoryTrigger.click();

    // --- Rename the category while it is the only open section ---
    const visibleEdit = page
      .getByRole("button", { name: "Edit", exact: true })
      .filter({ visible: true });
    await visibleEdit.first().click();
    const editCategoryDialog = page.getByRole("dialog");
    await editCategoryDialog.locator('input[name="name"]').fill(renamedCategory);
    await editCategoryDialog.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Category updated.")).toBeVisible();
    await expect(
      page.getByRole("button").filter({ hasText: renamedCategory }).first(),
    ).toBeVisible();

    // --- Add a subcategory under it ---
    await page.getByRole("button", { name: "Add subcategory", exact: true }).click();
    const subDialog = page.getByRole("dialog");
    await subDialog.locator("#category-name").fill(subcategoryName);
    await subDialog.getByRole("button", { name: "Add subcategory", exact: true }).click();
    await expect(page.getByText("Subcategory created.")).toBeVisible();
    await expect(page.getByText(subcategoryName)).toBeVisible();

    // --- Add a task inside the subcategory ---
    await page.getByRole("button", { name: "Add task", exact: true }).click();
    const taskDialog = page.getByRole("dialog");
    await taskDialog.getByLabel("Task name").fill(taskName);
    await taskDialog.getByRole("button", { name: "Add task", exact: true }).click();
    await expect(page.getByText("Task created.")).toBeVisible();
    const taskRow = page.locator("li").filter({ hasText: taskName });
    await expect(taskRow).toBeVisible();
    await expect(taskRow).toContainText("Active");

    // --- Rename the task via its edit dialog ---
    await taskRow.getByRole("button", { name: "Edit", exact: true }).click();
    const editTaskDialog = page.getByRole("dialog");
    await editTaskDialog.locator('input[name="name"]').fill(renamedTask);
    await editTaskDialog.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Task updated.")).toBeVisible();
    const renamedRow = page.locator("li").filter({ hasText: renamedTask });
    await expect(renamedRow).toBeVisible();

    // --- Toggle the task off and back on ---
    await renamedRow.getByRole("button", { name: "Deactivate" }).click();
    await expect(renamedRow).toContainText("Inactive");
    await renamedRow.getByRole("button", { name: "Activate" }).click();
    await expect(renamedRow).toContainText("Active");

    // --- Deactivate the whole E2E tree so it stays out of task-log dropdowns ---
    await page.getByRole("button", { name: "Deactivate category" }).click();
    await expect(
      page.getByRole("button").filter({ hasText: renamedCategory }).first(),
    ).toContainText("Inactive");
  });

  test("add-category dialog enforces a required name", async ({ page }) => {
    await page.goto("/create-task");
    await page.getByRole("button", { name: "Add category", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("#category-name").fill("x");
    await dialog.locator("#category-name").fill("");
    await dialog.getByRole("button", { name: "Add category", exact: true }).click();
    // Native required validation keeps the dialog open and creates nothing.
    await expect(dialog).toBeVisible();
    await expect(page.getByText("Category created.")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
