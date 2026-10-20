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
import type { DepartmentTaskStats } from "@/lib/data/task-logs";

/** Per-department rollup for the admin dashboard (includes "Unassigned"). */
export function DepartmentProgressTable({
  departments,
}: {
  departments: DepartmentTaskStats[];
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Progress per department</CardTitle>
        <span className="text-muted-foreground text-xs">
          sorted by task count
        </span>
      </CardHeader>
      <CardContent>
        {departments.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No departments yet. Add one on the Departments page.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Total Tasks</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">In progress</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                  <TableHead className="w-44">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((department) => (
                  <TableRow key={department.departmentId ?? "unassigned"}>
                    <TableCell>
                      <span className="font-medium">
                        {department.departmentName}
                      </span>
                      {!department.departmentId && (
                        <span className="text-muted-foreground text-xs">
                          {" "}
                          · no department
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {department.memberCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {department.total}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {department.pending}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-primary">
                      {department.inProgress}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-success">
                      {department.completed}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium tabular-nums ${
                        department.overdue > 0
                          ? "text-warning"
                          : "text-muted-foreground"
                      }`}
                    >
                      {department.overdue}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="min-w-20 flex-1">
                          <ProgressBar
                            percent={department.progressPercent}
                            label={`${department.departmentName} progress`}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right font-medium text-xs tabular-nums">
                          {department.progressPercent}%
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

export function DepartmentProgressTableSkeleton() {
  return (
    <Card aria-busy="true">
      <CardHeader className="flex-row items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-32" />
      </CardHeader>
      <CardContent className="grid gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
