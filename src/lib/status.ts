export const TASK_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const OVERDUE_LABEL = "Overdue";

/**
 * Derived state: never stored. A log is overdue only when its deadline's
 * calendar day is before today — a deadline of today (or tomorrow) is not
 * overdue yet.
 */
export function isOverdue(
  status: TaskStatus,
  deadline: string | null | undefined,
): boolean {
  if (status !== "pending" && status !== "in_progress") return false;
  if (!deadline) return false;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return false;
  const deadlineDay = date.toISOString().slice(0, 10);
  const todayDay = new Date().toISOString().slice(0, 10);
  return deadlineDay < todayDay;
}
