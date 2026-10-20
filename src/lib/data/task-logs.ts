import "server-only";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listBrands, listMembers } from "@/lib/data/masters";
import { listDepartments } from "@/lib/data/departments";
import { isOverdue, type TaskStatus } from "@/lib/status";
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

export async function listRecentTaskLogs(limit = 5, month?: string) {
  const supabase = await createClient();
  let query = supabase.from("task_logs").select(LOG_SELECT);
  const range = monthToRange(month);
  if (range) {
    query = query.gte("created_at", range.fromIso).lt("created_at", range.toIso);
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to load recent task logs: ${error.message}`);
  return (data ?? []) as unknown as TaskLogWithRelations[];
}

/** UTC [month start, next month start) for a "YYYY-MM" filter value. */
function monthToRange(
  month?: string,
): { fromIso: string; toIso: string } | null {
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { fromIso: start.toISOString(), toIso: end.toISOString() };
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
  overdue: number;
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

  const [total, pending, inProgress, completed, cancelled, overdue] =
    await Promise.all([
      base(),
      base().eq("status", "pending"),
      base().eq("status", "in_progress"),
      base().eq("status", "completed"),
      base().eq("status", "cancelled"),
      // Overdue = deadline's calendar day is before today (UTC). A deadline
      // of today never counts — must match isOverdue() in lib/status.ts.
      base()
        .in("status", ["pending", "in_progress"])
        .lt(
          "deadline",
          `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
        ),
    ]);

  const failed = [total, pending, inProgress, completed, cancelled, overdue].find(
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
    overdue: overdue.count ?? 0,
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

export type GroupTaskStats = DashboardMetrics & {
  /** Non-cancelled logs — the denominator for overall progress. */
  progressTotal: number;
  /** Share of non-cancelled logs that are completed, 0–100. */
  progressPercent: number;
};

export type BrandTaskStats = GroupTaskStats & {
  brandId: string;
  brandName: string;
};

export type UserTaskStats = GroupTaskStats & {
  userId: string;
  userName: string;
  userEmail: string;
  isActive: boolean;
};

export type DepartmentTaskStats = GroupTaskStats & {
  /** null = members without a department ("Unassigned" bucket). */
  departmentId: string | null;
  departmentName: string;
  memberCount: number;
};

export type AdminDashboardStats = {
  overall: GroupTaskStats;
  byBrand: BrandTaskStats[];
  byUser: UserTaskStats[];
  /** Admin-only: rollup per department (computed but only rendered for admins). */
  byDepartment: DepartmentTaskStats[];
};

function buildGroupStats(
  rows: { status: string; deadline: string | null }[],
): GroupTaskStats {
  let pending = 0;
  let inProgress = 0;
  let completed = 0;
  let cancelled = 0;
  let overdue = 0;

  for (const row of rows) {
    if (row.status === "pending") pending++;
    else if (row.status === "in_progress") inProgress++;
    else if (row.status === "completed") completed++;
    else if (row.status === "cancelled") cancelled++;
    if (isOverdue(row.status as TaskStatus, row.deadline)) overdue++;
  }

  const total = rows.length;
  const progressTotal = total - cancelled;
  const progressPercent =
    progressTotal === 0
      ? 0
      : Math.round((completed / progressTotal) * 100);

  return {
    total,
    pending,
    inProgress,
    completed,
    cancelled,
    overdue,
    progressTotal,
    progressPercent,
  };
}

/**
 * Dashboard data: overall stats plus per-brand, per-member and (for
 * department-wide calls) per-department breakdowns. Aggregated in JS from a
 * single lightweight task_logs fetch (PostgREST has no GROUP BY). Pass
 * `month` ("YYYY-MM") to scope logs to their creation month. Pass
 * `departmentId` to scope everything to one department (Department Head
 * dashboard; RLS also restricts the rows a head can read).
 */
export async function getAdminDashboardStats(
  month?: string,
  departmentId?: string,
): Promise<AdminDashboardStats> {
  const supabase = await createClient();
  let query = supabase
    .from("task_logs")
    .select(
      "brand_id, status, deadline, assignee:profiles!assigned_to ( id, full_name, email, department_id )",
    );
  const range = monthToRange(month);
  if (range) {
    query = query.gte("created_at", range.fromIso).lt("created_at", range.toIso);
  }
  if (departmentId) {
    query = query.eq("assignee.department_id", departmentId);
  }
  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load dashboard stats: ${error.message}`);
  }

  type Row = {
    brand_id: string;
    status: string;
    deadline: string | null;
    assignee: {
      id: string;
      full_name: string;
      email: string;
      department_id: string | null;
    } | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  const [brands, members] = await Promise.all([
    listBrands(false),
    listMembers(),
  ]);

  const overall = buildGroupStats(rows);

  const byBrand: BrandTaskStats[] = brands
    .map((brand) => ({
      brandId: brand.id,
      brandName: brand.name,
      ...buildGroupStats(rows.filter((row) => row.brand_id === brand.id)),
    }))
    .sort(
      (a, b) => b.total - a.total || a.brandName.localeCompare(b.brandName),
    );

  const rowsByUser = new Map<string, Row[]>();
  for (const row of rows) {
    if (!row.assignee) continue;
    const list = rowsByUser.get(row.assignee.id);
    if (list) list.push(row);
    else rowsByUser.set(row.assignee.id, [row]);
  }

  const byUser: UserTaskStats[] = members
    .map((member) => ({
      userId: member.id,
      userName: member.full_name || member.email,
      userEmail: member.email,
      isActive: member.is_active,
      ...buildGroupStats(rowsByUser.get(member.id) ?? []),
    }))
    .sort(
      (a, b) =>
        b.progressPercent - a.progressPercent ||
        b.total - a.total ||
        a.userName.localeCompare(b.userName),
    );

  const byDepartment = departmentId
    ? []
    : await buildDepartmentStats(rows, members);

  return { overall, byBrand, byUser, byDepartment };
}

/** Per-department rollup for the admin dashboard (includes "Unassigned"). */
async function buildDepartmentStats(
  rows: {
    status: string;
    deadline: string | null;
    assignee: { department_id: string | null } | null;
  }[],
  members: { department_id: string | null }[],
): Promise<DepartmentTaskStats[]> {
  const departments = await listDepartments(false);

  const memberCounts = new Map<string | null, number>();
  for (const member of members) {
    const key = member.department_id;
    memberCounts.set(key, (memberCounts.get(key) ?? 0) + 1);
  }

  const rowsByDepartment = new Map<string | null, typeof rows>();
  for (const row of rows) {
    const key = row.assignee?.department_id ?? null;
    const list = rowsByDepartment.get(key);
    if (list) list.push(row);
    else rowsByDepartment.set(key, [row]);
  }

  const stats: DepartmentTaskStats[] = departments.map((department) => ({
    departmentId: department.id,
    departmentName: department.name,
    memberCount: memberCounts.get(department.id) ?? 0,
    ...buildGroupStats(rowsByDepartment.get(department.id) ?? []),
  }));

  const unassignedRows = rowsByDepartment.get(null) ?? [];
  const unassignedMembers = memberCounts.get(null) ?? 0;
  if (unassignedMembers > 0 || unassignedRows.length > 0) {
    stats.push({
      departmentId: null,
      departmentName: "Unassigned",
      memberCount: unassignedMembers,
      ...buildGroupStats(unassignedRows),
    });
  }

  return stats.sort(
    (a, b) => b.total - a.total || a.departmentName.localeCompare(b.departmentName),
  );
}
