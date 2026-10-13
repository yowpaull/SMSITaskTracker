import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { TaskLogWithRelations } from "@/lib/types";
import { DeleteTaskLogButton } from "./delete-task-log-button";
import { PriorityBadges } from "./priority-badges";
import { StatusBadge } from "./status-badge";

export function TaskLogTable({
  logs,
  showAssignee = true,
}: {
  logs: TaskLogWithRelations[];
  showAssignee?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Brand</TableHead>
            {showAssignee && <TableHead>Assignee</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead>Date Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-medium">
                {log.task?.name ?? "Unknown task"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {log.task?.category
                  ? log.task.category.parent
                    ? `${log.task.category.parent.name} / ${log.task.category.name}`
                    : log.task.category.name
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {log.brand?.name ?? "—"}
              </TableCell>
              {showAssignee && (
                <TableCell className="text-muted-foreground">
                  {log.assignee?.full_name ||
                    log.assignee?.email ||
                    "—"}
                </TableCell>
              )}
              <TableCell>
                <StatusBadge status={log.status} deadline={log.deadline} />
              </TableCell>
              <TableCell>
                <PriorityBadges
                  urgent={log.urgent}
                  important={log.important}
                />
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDate(log.deadline)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDate(log.created_at)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    render={<Link href={`/tasks/${log.id}`} />}
                    nativeButton={false}
                    variant="ghost"
                    size="sm"
                  >
                    View
                  </Button>
                  <Button
                    render={<Link href={`/tasks/${log.id}/edit`} />}
                    nativeButton={false}
                    variant="ghost"
                    size="sm"
                  >
                    Edit
                  </Button>
                  <DeleteTaskLogButton
                    logId={log.id}
                    taskName={log.task?.name ?? "Unknown task"}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
