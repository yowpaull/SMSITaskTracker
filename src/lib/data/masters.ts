import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Brand,
  Category,
  Profile,
  Subcategory,
  TaskDefinition,
  TaskOption,
  TaskPickGroup,
} from "@/lib/types";

export async function listBrands(onlyActive = false) {
  const supabase = await createClient();
  let query = supabase.from("brands").select("*").order("name");
  if (onlyActive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load brands: ${error.message}`);
  return (data ?? []) as Brand[];
}

export async function listCategories(onlyActive = false) {
  const supabase = await createClient();
  let query = supabase.from("categories").select("*").order("name");
  if (onlyActive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  return (data ?? []) as Category[];
}

export type SubcategoryWithCategory = Subcategory & {
  category: { id: string; name: string } | null;
};

/** All subcategories with "Main / Sub" labels — for filters and pickers. */
export async function listSubcategoriesWithLabels(onlyActive = false): Promise<
  (SubcategoryWithCategory & { label: string })[]
> {
  const supabase = await createClient();
  let query = supabase
    .from("subcategories")
    .select("*, category:categories!inner ( id, name )")
    .order("name");
  if (onlyActive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load subcategories: ${error.message}`);
  }
  const rows = (data ?? []) as unknown as SubcategoryWithCategory[];
  return rows
    .map((row) => ({
      ...row,
      label: row.category ? `${row.category.name} / ${row.name}` : row.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export type TaskLite = {
  id: string;
  name: string;
  is_active: boolean;
  subcategory_id: string;
};

export type SubcategoryWithTasks = Subcategory & { tasks: TaskLite[] };

export type CategoryHierarchyItem = Category & {
  subcategories: SubcategoryWithTasks[];
  taskCount: number;
};

function sortTasks(tasks: TaskLite[]) {
  tasks.sort((a, b) => a.name.localeCompare(b.name));
  return tasks;
}

/** Main categories with their subcategories and tasks, for /create-task. */
export async function listCategoryHierarchy(): Promise<CategoryHierarchyItem[]> {
  const supabase = await createClient();
  const [categoriesResult, subcategoriesResult, tasksResult] =
    await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("subcategories").select("*").order("name"),
      supabase
        .from("tasks")
        .select("id, name, is_active, subcategory_id"),
    ]);
  if (categoriesResult.error) {
    throw new Error(
      `Failed to load categories: ${categoriesResult.error.message}`,
    );
  }
  if (subcategoriesResult.error) {
    throw new Error(
      `Failed to load subcategories: ${subcategoriesResult.error.message}`,
    );
  }
  if (tasksResult.error) {
    throw new Error(`Failed to load tasks: ${tasksResult.error.message}`);
  }

  const categories = (categoriesResult.data ?? []) as Category[];
  const subcategories = (subcategoriesResult.data ?? []) as Subcategory[];
  const tasks = (tasksResult.data ?? []) as TaskLite[];

  const tasksBySubcategory = new Map<string, TaskLite[]>();
  for (const task of tasks) {
    const list = tasksBySubcategory.get(task.subcategory_id) ?? [];
    list.push(task);
    tasksBySubcategory.set(task.subcategory_id, list);
  }

  const items: CategoryHierarchyItem[] = categories.map((category) => ({
    ...category,
    subcategories: subcategories
      .filter((subcategory) => subcategory.category_id === category.id)
      .map((subcategory) => ({
        ...subcategory,
        tasks: sortTasks(tasksBySubcategory.get(subcategory.id) ?? []),
      })),
    taskCount: 0,
  }));
  for (const item of items) {
    item.taskCount = item.subcategories.reduce(
      (sum, sub) => sum + sub.tasks.length,
      0,
    );
  }
  return items;
}

/**
 * Active tasks grouped for the new/edit task-log cascade:
 * main category → subcategory → task (only subcategories with active tasks).
 */
export async function listTaskPickGroups(): Promise<TaskPickGroup[]> {
  const supabase = await createClient();
  const [tasksResult, subcategoriesResult, categoriesResult] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id, name, subcategory_id")
        .eq("is_active", true)
        .order("name"),
      supabase.from("subcategories").select("id, name, category_id"),
      supabase.from("categories").select("id, name"),
    ]);
  if (tasksResult.error) {
    throw new Error(
      `Failed to load task definitions: ${tasksResult.error.message}`,
    );
  }
  if (subcategoriesResult.error) {
    throw new Error(
      `Failed to load subcategories: ${subcategoriesResult.error.message}`,
    );
  }
  if (categoriesResult.error) {
    throw new Error(
      `Failed to load categories: ${categoriesResult.error.message}`,
    );
  }

  type TaskRow = { id: string; name: string; subcategory_id: string };
  const subcategoryById = new Map(
    ((subcategoriesResult.data ?? []) as {
      id: string;
      name: string;
      category_id: string;
    }[]).map((sub) => [sub.id, sub]),
  );
  const categoryById = new Map(
    ((categoriesResult.data ?? []) as { id: string; name: string }[]).map(
      (category) => [category.id, category],
    ),
  );

  type MutableGroup = {
    mainCategoryId: string;
    mainCategoryName: string;
    subOrder: { id: string; name: string }[];
    tasksBySub: Record<string, TaskOption[]>;
  };
  const groups = new Map<string, MutableGroup>();

  for (const task of (tasksResult.data ?? []) as TaskRow[]) {
    const subcategory = subcategoryById.get(task.subcategory_id);
    if (!subcategory) continue;
    let group = groups.get(subcategory.category_id);
    if (!group) {
      group = {
        mainCategoryId: subcategory.category_id,
        mainCategoryName:
          categoryById.get(subcategory.category_id)?.name ?? "Uncategorized",
        subOrder: [],
        tasksBySub: {},
      };
      groups.set(subcategory.category_id, group);
    }
    if (!group.tasksBySub[subcategory.id]) {
      group.tasksBySub[subcategory.id] = [];
      group.subOrder.push({ id: subcategory.id, name: subcategory.name });
    }
    group.tasksBySub[subcategory.id].push({
      label: task.name,
      value: task.id,
    });
  }

  return [...groups.values()]
    .map((group): TaskPickGroup => ({
      mainCategoryId: group.mainCategoryId,
      mainCategoryName: group.mainCategoryName,
      subcategories: group.subOrder
        .map((sub) => ({
          id: sub.id,
          name: sub.name,
          tasks: group.tasksBySub[sub.id] ?? [],
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.mainCategoryName.localeCompare(b.mainCategoryName));
}

export async function listTaskDefinitions(onlyActive = false) {
  const supabase = await createClient();
  let query = supabase
    .from("tasks")
    .select("*, subcategory:subcategories ( id, name )")
    .order("name");
  if (onlyActive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load task definitions: ${error.message}`);
  return (data ?? []) as unknown as TaskDefinitionWithSubcategory[];
}

export type TaskDefinitionWithSubcategory = TaskDefinition & {
  subcategory: { id: string; name: string } | null;
};

export async function listMembers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");
  if (error) throw new Error(`Failed to load members: ${error.message}`);
  return (data ?? []) as Profile[];
}
