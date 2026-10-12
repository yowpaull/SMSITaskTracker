import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TaskLogFilters, TaskLogWithRelations } from "@/lib/types";

export const TASK_LOG_PAGE_SIZE = 25;

const LOG_SELECT = `
  id, task_id, brand_id, assigned_to, created_by, status, urgent, important,
  completed_at, deadline, created_at, updated_at,
  task:tasks ( id, name, category_id, category:categories ( id, name ) ),
  brand:brands ( id, name ),
  assignee:profiles!assigned_to ( id, full_name, email )
`;

export async function listTaskLogs(filters: TaskLogFilters, page = 1) {
  const supabase = await createClient();
  let query = supabase
    .from("task_logs")
    .select(LOG_SELECT, { count: "exact" });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.brandId) query = query.eq("brand_id", filters.brandId);
  if (filters.categoryId) {
    query = query.eq("task.category_id", filters.categoryId);
  }
  if (filters.assignedTo) query = query.eq("assigned_to", filters.assignedTo);
  if (filters.q) query = query.ilike("task.name", `%${filters.q}%`);

  const offset = (Math.max(page, 1) - 1) * TASK_LOG_PAGE_SIZE;

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + TASK_LOG_PAGE_SIZE - 1);

  if (error) throw new Error(`Failed to load task logs: ${error.message}`);

  return {
    logs: (data ?? []) as unknown as TaskLogWithRelations[],
    total: count ?? 0,
  };
}

export async function listRecentTaskLogs(limit = 5) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_logs")
    .select(LOG_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to load recent task logs: ${error.message}`);
  return (data ?? []) as unknown as TaskLogWithRelations[];
}

export async function getTaskLog(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_logs")
    .select(LOG_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load task log: ${error.message}`);
  return (data ?? null) as TaskLogWithRelations | null;
}

export type DashboardMetrics = {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  delayed: number;
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createClient();
  const base = () =>
    supabase.from("task_logs").select("id", { count: "exact", head: true });

  const [total, pending, inProgress, completed, cancelled, delayed] =
    await Promise.all([
      base(),
      base().eq("status", "pending"),
      base().eq("status", "in_progress"),
      base().eq("status", "completed"),
      base().eq("status", "cancelled"),
      base()
        .in("status", ["pending", "in_progress"])
        .lt("deadline", new Date().toISOString()),
    ]);

  const failed = [total, pending, inProgress, completed, cancelled, delayed].find(
    (result) => result.error,
  );
  if (failed?.error) {
    throw new Error(`Failed to load metrics: ${failed.error.message}`);
  }

  return {
    total: total.count ?? 0,
    pending: pending.count ?? 0,
    inProgress: inProgress.count ?? 0,
    completed: completed.count ?? 0,
    cancelled: cancelled.count ?? 0,
    delayed: delayed.count ?? 0,
  };
}
