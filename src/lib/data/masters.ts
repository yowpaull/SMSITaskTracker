import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Brand, Category, Profile, TaskDefinition } from "@/lib/types";

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
