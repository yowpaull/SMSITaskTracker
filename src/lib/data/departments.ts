import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Department } from "@/lib/types";

export async function listDepartments(onlyActive = false) {
  const supabase = await createClient();
  let query = supabase.from("departments").select("*").order("name");
  if (onlyActive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load departments: ${error.message}`);
  }
  return (data ?? []) as Department[];
}

export async function getDepartment(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("departments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as Department | null;
}
