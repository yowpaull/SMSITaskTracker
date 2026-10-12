import { Suspense } from "react";
import { MetricCards, MetricCardsSkeleton } from "@/components/metrics/metric-cards";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskLogTable } from "@/components/tasks/task-log-table";
import {
  getDashboardMetrics,
  listRecentTaskLogs,
} from "@/lib/data/task-logs";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";

async function DashboardContent() {
  const [metrics, recent] = await Promise.all([
    getDashboardMetrics(),
    listRecentTaskLogs(5),
  ]);

  return (
    <div className="grid gap-6">
      <MetricCards metrics={metrics} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent task logs</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <Empty>
              <EmptyTitle>No task logs yet</EmptyTitle>
              <EmptyDescription>
                Create a task log from the Tasks page to start tracking
                progress.
              </EmptyDescription>
            </Empty>
          ) : (
            <TaskLogTable logs={recent} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true">
      <MetricCardsSkeleton />
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="grid gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Dashboard"
        description="Task progress across brands and categories."
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
