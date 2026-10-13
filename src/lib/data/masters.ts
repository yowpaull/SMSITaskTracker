import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Brand,
  Category,
  Profile,
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

export type CategoryWithParent = Category & {
  parent: { id: string; name: string } | null;
};

export async function listCategories(onlyActive = false) {
  const supabase = await createClient();
  let query = supabase.from("categories").select("*").order("name");
  if (onlyActive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  return attachParents((data ?? []) as Category[]);
}

/** Resolve parent names for the given categories via a separate query. */
async function attachParents(
  rows: Category[],
): Promise<CategoryWithParent[]> {
  const parentIds = [
    ...new Set(
      rows
        .map((row) => row.parent_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const parentNames = new Map<string, string>();
  if (parentIds.length > 0) {
    const supabase = await createClient();
    const { data: parents, error } = await supabase
      .from("categories")
      .select("id, name")
      .in("id", parentIds);
    if (error) {
      throw new Error(`Failed to load categories: ${error.message}`);
    }
    for (const parent of (parents ?? []) as { id: string; name: string }[]) {
      parentNames.set(parent.id, parent.name);
    }
  }
  return rows.map((row) => ({
    ...row,
    parent: row.parent_id
      ? {
          id: row.parent_id,
          name: parentNames.get(row.parent_id) ?? "",
        }
      : null,
  }));
}

/** "Main / Sub" display label for a category option. */
export function categoryLabel(category: CategoryWithParent) {
  return category.parent
    ? `${category.parent.name} / ${category.name}`
    : category.name;
}

export type TaskLite = { id: string; name: string; is_active: boolean };

export type CategoryHierarchyItem = Category & {
  directTasks: TaskLite[];
  subcategories: (Category & { tasks: TaskLite[] })[];
  taskCount: number;
};

function sortTasks(tasks: TaskLite[]) {
  tasks.sort((a, b) => a.name.localeCompare(b.name));
  return tasks;
}

/** Main categories with their subcategories and tasks, for /create-task. */
export async function listCategoryHierarchy(): Promise<CategoryHierarchyItem[]> {
  const supabase = await createClient();
  const [categoriesResult, tasksResult] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("tasks").select("id, name, is_active, category_id"),
  ]);
  if (categoriesResult.error) {
    throw new Error(
      `Failed to load categories: ${categoriesResult.error.message}`,
    );
  }
  if (tasksResult.error) {
    throw new Error(`Failed to load tasks: ${tasksResult.error.message}`);
  }

  const rows = (categoriesResult.data ?? []) as Category[];
  const tasks = (tasksResult.data ?? []) as (TaskLite & {
    category_id: string;
  })[];

  const tasksByCategory = new Map<string, TaskLite[]>();
  for (const task of tasks) {
    const list = tasksByCategory.get(task.category_id) ?? [];
    list.push({ id: task.id, name: task.name, is_active: task.is_active });
    tasksByCategory.set(task.category_id, list);
  }

  const mains: CategoryHierarchyItem[] = [];
  const mainById = new Map<string, CategoryHierarchyItem>();
  const subs: (Category & { tasks: TaskLite[] })[] = [];

  for (const row of rows) {
    if (row.parent_id === null) {
      const item: CategoryHierarchyItem = {
        ...row,
        directTasks: sortTasks(tasksByCategory.get(row.id) ?? []),
        subcategories: [],
        taskCount: 0,
      };
      mains.push(item);
      mainById.set(row.id, item);
    } else {
      subs.push({
        ...row,
        tasks: sortTasks(tasksByCategory.get(row.id) ?? []),
      });
    }
  }
  for (const sub of subs) {
    const main = sub.parent_id ? mainById.get(sub.parent_id) : undefined;
    if (main) main.subcategories.push(sub);
  }
  for (const main of mains) {
    main.subcategories.sort((a, b) => a.name.localeCompare(b.name));
    main.taskCount =
      main.directTasks.length +
      main.subcategories.reduce((sum, sub) => sum + sub.tasks.length, 0);
  }
  return mains;
}

/**
 * Active tasks grouped for the new/edit task-log cascade:
 * main category → subcategory → task (main categories with at least one
 * active task only).
 */
export async function listTaskPickGroups(): Promise<TaskPickGroup[]> {
  const supabase = await createClient();
  const [definitionsResult, categoriesResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, name, category_id, category:categories!inner ( id, name, parent_id )")
      .eq("is_active", true)
      .order("name"),
    supabase.from("categories").select("id, name, parent_id"),
  ]);
  if (definitionsResult.error) {
    throw new Error(
      `Failed to load task definitions: ${definitionsResult.error.message}`,
    );
  }
  if (categoriesResult.error) {
    throw new Error(
      `Failed to load categories: ${categoriesResult.error.message}`,
    );
  }

  type TaskRow = {
    id: string;
    name: string;
    category_id: string;
    category: { id: string; name: string; parent_id: string | null } | null;
  };

  const categoryById = new Map(
    ((categoriesResult.data ?? []) as {
      id: string;
      name: string;
      parent_id: string | null;
    }[]).map((c) => [c.id, c]),
  );

  const groups = new Map<
    string,
    TaskPickGroup & { subNames: Map<string, string> }
  >();

  function ensureGroup(mainId: string) {
    let group = groups.get(mainId);
    if (!group) {
      const main = categoryById.get(mainId);
      group = {
        mainCategoryId: mainId,
        mainCategoryName: main?.name ?? "Uncategorized",
        subcategories: [],
        directTasks: [],
        tasksBySubcategory: {},
        subNames: new Map(),
      };
      groups.set(mainId, group);
    }
    return group;
  }

  for (const row of (definitionsResult.data ?? []) as TaskRow[]) {
    const option: TaskOption = { label: row.name, value: row.id };
    const category = row.category;
    if (!category) continue;

    if (category.parent_id === null) {
      ensureGroup(category.id).directTasks.push(option);
    } else {
      const group = ensureGroup(category.parent_id);
      if (!group.tasksBySubcategory[category.id]) {
        group.tasksBySubcategory[category.id] = [];
        group.subNames.set(category.id, category.name);
      }
      group.tasksBySubcategory[category.id].push(option);
    }
  }

  return [...groups.values()]
    .map((group) => {
      group.subcategories = [...group.subNames.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return group;
    })
    .sort((a, b) => a.mainCategoryName.localeCompare(b.mainCategoryName));
}

export async function listTaskDefinitions(onlyActive = false) {
  const supabase = await createClient();
  let query = supabase
    .from("tasks")
    .select("*, category:categories ( id, name )")
    .order("name");
  if (onlyActive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load task definitions: ${error.message}`);
  return (data ?? []) as unknown as TaskDefinitionWithCategory[];
}

export type TaskDefinitionWithCategory = TaskDefinition & {
  category: { id: string; name: string } | null;
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
