import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { MetricCards, MetricCardsSkeleton } from "@/components/metrics/metric-cards";
import {
  StatusBreakdownChart,
  StatusBreakdownChartSkeleton,
} from "@/components/metrics/status-breakdown-chart";
import {
  BrandProgressChart,
  BrandProgressChartSkeleton,
} from "@/components/metrics/brand-progress-chart";
import {
  UserProgressTable,
  UserProgressTableSkeleton,
} from "@/components/metrics/user-progress-table";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskLogTable } from "@/components/tasks/task-log-table";
import { requireProfile } from "@/lib/auth";
import {
  getAdminDashboardStats,
  listRecentTaskLogs,
} from "@/lib/data/task-logs";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";

async function DashboardContent() {
  await connection();
  const [stats, recent] = await Promise.all([
    getAdminDashboardStats(),
    listRecentTaskLogs(5),
  ]);

  return (
    <div className="grid gap-6">
      <MetricCards metrics={stats.overall} />
      <div className="grid gap-6 lg:grid-cols-2">
        <StatusBreakdownChart stats={stats.overall} />
        <BrandProgressChart brands={stats.byBrand} />
      </div>
      <UserProgressTable users={stats.byUser} />
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
      <div className="grid gap-6 lg:grid-cols-2">
        <StatusBreakdownChartSkeleton />
        <BrandProgressChartSkeleton />
      </div>
      <UserProgressTableSkeleton />
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

export const instant = false;

export default async function DashboardPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/tasks");

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Dashboard"
        description="Task progress across brands and members."
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
