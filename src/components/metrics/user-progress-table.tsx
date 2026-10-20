import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProgressBar } from "@/components/metrics/progress-chart-bits";
import type { UserTaskStats } from "@/lib/data/task-logs";

/** Every member's task counts by status plus overall progress (admin dashboard). */
export function UserProgressTable({ users }: { users: UserTaskStats[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Member progress</CardTitle>
        <span className="text-muted-foreground text-xs">
          sorted by overall progress
        </span>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-muted-foreground text-sm">No members yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Total Tasks</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">In progress</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Cancelled</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                  <TableHead className="w-44">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <span className="font-medium">{user.userName}</span>
                      {!user.isActive && (
                        <span className="text-muted-foreground text-xs">
                          {" "}
                          · deactivated
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {user.total}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {user.pending}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-primary">
                      {user.inProgress}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-success">
                      {user.completed}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {user.cancelled}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium tabular-nums ${
                        user.overdue > 0 ? "text-warning" : "text-muted-foreground"
                      }`}
                    >
                      {user.overdue}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="min-w-20 flex-1">
                          <ProgressBar
                            percent={user.progressPercent}
                            label={`${user.userName} progress`}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right font-medium text-xs tabular-nums">
                          {user.progressPercent}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function UserProgressTableSkeleton() {
  return (
    <Card aria-busy="true">
      <CardHeader className="flex-row items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-32" />
      </CardHeader>
      <CardContent className="grid gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
