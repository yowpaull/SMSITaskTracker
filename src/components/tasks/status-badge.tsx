import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, isDelayed, type TaskStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

const STATUS_CLASSES: Record<TaskStatus, string> = {
  pending: "bg-secondary text-secondary-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  cancelled: "bg-muted text-muted-foreground",
};

export function StatusBadge({
  status,
  deadline,
}: {
  status: TaskStatus;
  deadline?: string | null;
}) {
  const delayed = isDelayed(status, deadline);

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge
        variant="secondary"
        className={cn("border-transparent", STATUS_CLASSES[status])}
      >
        {STATUS_LABELS[status]}
      </Badge>
      {delayed && (
        <Badge
          variant="secondary"
          className="border-transparent bg-warning/10 text-warning"
        >
          Delayed
        </Badge>
      )}
    </span>
  );
}
