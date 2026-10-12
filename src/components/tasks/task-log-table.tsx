import Link from "next/link";
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                <Link
                  href={`/tasks/${log.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {log.task?.name ?? "Unknown task"}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {log.task?.category?.name ?? "—"}
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
