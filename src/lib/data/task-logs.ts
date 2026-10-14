import "server-only";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { TaskLogFilters, TaskLogWithRelations } from "@/lib/types";

export const TASK_LOG_PAGE_SIZE = 25;

const LOG_SELECT = `
  id, task_id, brand_id, assigned_to, created_by, status, urgent, important,
  completed_at, deadline, created_at, updated_at,
  task:tasks!inner ( id, name, subcategory_id, subcategory:subcategories ( id, name, category_id, category:categories ( id, name ) ) ),
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
  if (filters.subcategoryId) {
    query = query.eq("task.subcategory_id", filters.subcategoryId);
  }
  if (filters.assignedTo) query = query.eq("assigned_to", filters.assignedTo);
  if (filters.q) query = query.ilike("task.name", `%${filters.q}%`);
  if (filters.from) {
    query = query.gte("created_at", `${filters.from}T00:00:00.000Z`);
  }
  if (filters.to) {
    // Inclusive end-of-day bound (timestamps are stored in UTC).
    const end = new Date(`${filters.to}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    query = query.lt("created_at", end.toISOString());
  }

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

/**
 * All logs created within [fromIso, toIso) — used by the Excel export.
 * Fetches in chunks so large months aren't capped by PostgREST limits.
 */
export async function listTaskLogsInRange(fromIso: string, toIso: string) {
  const supabase = await createClient();
  const logs: TaskLogWithRelations[] = [];
  const CHUNK = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("task_logs")
      .select(LOG_SELECT)
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .order("created_at", { ascending: true })
      .range(from, from + CHUNK - 1);

    if (error) {
      throw new Error(`Failed to load task logs for export: ${error.message}`);
    }

    logs.push(...((data ?? []) as unknown as TaskLogWithRelations[]));
    if (!data || data.length < CHUNK) break;
    from += CHUNK;
  }

  return logs;
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

export async function getDashboardMetrics(assignedTo?: string): Promise<DashboardMetrics> {
  const supabase = await createClient();
  const base = () => {
    let query = supabase
      .from("task_logs")
      .select("id", { count: "exact", head: true });
    if (assignedTo) query = query.eq("assigned_to", assignedTo);
    return query;
  };

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

export type MyTaskStats = DashboardMetrics & {
  /** Non-cancelled logs — the denominator for overall progress. */
  progressTotal: number;
  /** Share of non-cancelled logs that are completed, 0–100. */
  progressPercent: number;
};

/** Status counts + overall progress for the signed-in user's own task logs. */
export async function getMyTaskStats(): Promise<MyTaskStats> {
  const user = await requireUser();
  const metrics = await getDashboardMetrics(user.id);
  const progressTotal = metrics.total - metrics.cancelled;
  const progressPercent =
    progressTotal === 0
      ? 0
      : Math.round((metrics.completed / progressTotal) * 100);
  return { ...metrics, progressTotal, progressPercent };
}
