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

/** Derived state: past deadline but still open. Never stored. */
export function isOverdue(
  status: TaskStatus,
  deadline: string | null | undefined,
): boolean {
  if (status !== "pending" && status !== "in_progress") return false;
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}
