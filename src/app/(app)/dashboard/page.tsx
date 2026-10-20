import { Suspense } from "react";
import { connection } from "next/server";
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
import {
  DepartmentProgressTable,
  DepartmentProgressTableSkeleton,
} from "@/components/metrics/department-progress-table";
import { MonthFilter } from "@/components/metrics/month-filter";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskLogTable } from "@/components/tasks/task-log-table";
import { requireStaffProfile } from "@/lib/auth";
import {
  getAdminDashboardStats,
  listRecentTaskLogs,
} from "@/lib/data/task-logs";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function DashboardContent({
  searchParams,
  departmentId,
  isAdmin,
}: {
  searchParams: Promise<Params>;
  /** Department Head scope; undefined = admin (all departments). */
  departmentId?: string;
  isAdmin: boolean;
}) {
  await connection();
  const params = await searchParams;
  const rawMonth = first(params.month) ?? "";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : undefined;

  const [stats, recent] = await Promise.all([
    getAdminDashboardStats(month, departmentId),
    listRecentTaskLogs(5, month),
  ]);

  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <MonthFilter month={month} />
      </div>
      <MetricCards metrics={stats.overall} />
      <div className="grid gap-6 lg:grid-cols-2">
        <StatusBreakdownChart stats={stats.overall} />
        <BrandProgressChart brands={stats.byBrand} />
      </div>
      {isAdmin && <DepartmentProgressTable departments={stats.byDepartment} />}
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
      <div className="flex justify-end">
        <Skeleton className="h-8 w-56" />
      </div>
      <MetricCardsSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        <StatusBreakdownChartSkeleton />
        <BrandProgressChartSkeleton />
      </div>
      <DepartmentProgressTableSkeleton />
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const profile = await requireStaffProfile();
  const isAdmin = profile.role === "admin";

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Dashboard"
        description={
          isAdmin
            ? "Task progress across brands, members, and departments."
            : "Task progress for your department's members."
        }
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent
          searchParams={searchParams}
          departmentId={isAdmin ? undefined : profile.department_id ?? undefined}
          isAdmin={isAdmin}
        />
      </Suspense>
    </div>
  );
}
