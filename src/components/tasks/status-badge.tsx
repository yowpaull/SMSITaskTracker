import { Badge } from "@/components/ui/badge";
import {
  isOverdue,
  OVERDUE_LABEL,
  STATUS_LABELS,
  type TaskStatus,
} from "@/lib/status";
import { cn } from "@/lib/utils";

const STATUS_CLASSES: Record<TaskStatus, string> = {
  pending: "bg-secondary text-secondary-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  cancelled: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn("border-transparent", STATUS_CLASSES[status])}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}

/** Warning badge for past-deadline open work — rendered in its own column/row,
 * never merged into the status badge. Null when the log is not overdue. */
export function OverdueBadge({
  status,
  deadline,
}: {
  status: TaskStatus;
  deadline?: string | null;
}) {
  if (!isOverdue(status, deadline)) return null;

  return (
    <Badge
      variant="secondary"
      className="border-transparent bg-warning/10 text-warning"
    >
      {OVERDUE_LABEL}
    </Badge>
  );
}
