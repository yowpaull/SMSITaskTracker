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

/** Derived state: overdue work that is still open. Never stored. */
export function isDelayed(
  status: TaskStatus,
  deadline: string | null | undefined,
): boolean {
  if (status !== "pending" && status !== "in_progress") return false;
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}
