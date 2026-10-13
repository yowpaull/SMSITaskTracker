import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Brand,
  Category,
  DefinitionGroup,
  Profile,
  TaskDefinition,
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

export type CategoryWithTasks = Category & {
  tasks: { id: string; name: string; is_active: boolean }[];
};

export async function listCategoriesWithTasks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*, tasks ( id, name, is_active )")
    .order("name");
  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  const categories = (data ?? []) as unknown as CategoryWithTasks[];
  for (const category of categories) {
    category.tasks.sort((a, b) => a.name.localeCompare(b.name));
  }
  return categories;
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

/** Group active task definitions under their (non-selectable) category headers. */
export function groupDefinitionsByCategory(
  definitions: TaskDefinitionWithCategory[],
): DefinitionGroup[] {
  const groups = new Map<string, DefinitionGroup>();
  for (const definition of definitions) {
    const categoryName = definition.category?.name ?? "Uncategorized";
    let group = groups.get(categoryName);
    if (!group) {
      group = { categoryName, tasks: [] };
      groups.set(categoryName, group);
    }
    group.tasks.push({ label: definition.name, value: definition.id });
  }
  for (const group of groups.values()) {
    group.tasks.sort((a, b) => a.label.localeCompare(b.label));
  }
  return [...groups.values()].sort((a, b) =>
    a.categoryName.localeCompare(b.categoryName),
  );
}

export async function listMembers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");
  if (error) throw new Error(`Failed to load members: ${error.message}`);
  return (data ?? []) as Profile[];
}
