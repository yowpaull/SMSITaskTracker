import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { PlusIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskFilters } from "@/components/tasks/task-filters";
import { ExportTaskLogsButton } from "@/components/tasks/export-task-logs-button";
import { TaskLogTable } from "@/components/tasks/task-log-table";
import { MyProgressCards } from "@/components/metrics/my-progress-cards";
import { requireStaffProfile } from "@/lib/auth";
import {
  TASK_LOG_PAGE_SIZE,
  getMyTaskStats,
  listTaskLogs,
} from "@/lib/data/task-logs";
import { listBrands, listSubcategoriesWithLabels } from "@/lib/data/masters";
import { TASK_STATUSES, type TaskStatus } from "@/lib/status";

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDateParam(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function parseFilters(params: Params): {
  filters: {
    status?: TaskStatus;
    brandId?: string;
    subcategoryId?: string;
    q?: string;
    from?: string;
    to?: string;
  };
  page: number;
} {
  const statusRaw = first(params.status);
  const status = TASK_STATUSES.includes(statusRaw as TaskStatus)
    ? (statusRaw as TaskStatus)
    : undefined;
  const pageRaw = Number.parseInt(first(params.page) ?? "1", 10);

  return {
    filters: {
      status,
      brandId: first(params.brand),
      // URL param stays "category"; the value is a subcategory id.
      subcategoryId: first(params.category),
      q: first(params.q),
      from: parseDateParam(first(params.from)),
      to: parseDateParam(first(params.to)),
    },
    page: Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw,
  };
}

function buildHref(
  params: ReturnType<typeof parseFilters>["filters"],
  page: number,
) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.brandId) search.set("brand", params.brandId);
  if (params.subcategoryId) search.set("category", params.subcategoryId);
  if (params.q) search.set("q", params.q);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `/my-tasks?${qs}` : "/my-tasks";
}

async function MyTasksContent({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  await connection();
  const params = await searchParams;
  const { filters, page } = parseFilters(params);

  // Plain members are redirected to /tasks (their list is already personal).
  const profile = await requireStaffProfile();

  const [result, brands, subcategories, myStats] = await Promise.all([
    // Own logs only: assignee is forced to the signed-in user.
    listTaskLogs({ ...filters, assignedTo: profile.id }, page),
    listBrands(true),
    listSubcategoriesWithLabels(true),
    getMyTaskStats(),
  ]);

  const brandOptions = brands.map((brand) => ({
    label: brand.name,
    value: brand.id,
  }));
  const categoryOptions = subcategories.map((subcategory) => ({
    label: subcategory.label,
    value: subcategory.id,
  }));

  const totalPages = Math.max(
    1,
    Math.ceil(result.total / TASK_LOG_PAGE_SIZE),
  );

  return (
    <div className="grid gap-4">
      <MyProgressCards stats={myStats} />
      <TaskFilters
        filters={filters}
        brandOptions={brandOptions}
        categoryOptions={categoryOptions}
        memberOptions={[]}
        showAssigneeFilter={false}
        basePath="/my-tasks"
      />

      {result.logs.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Showing {(page - 1) * TASK_LOG_PAGE_SIZE + 1}–
          {Math.min(page * TASK_LOG_PAGE_SIZE, result.total)} of{" "}
          {result.total} {result.total === 1 ? "log" : "logs"}
        </p>
      )}

      {result.logs.length === 0 ? (
        <div className="rounded-lg border border-border">
          <Empty>
            <EmptyTitle>No task logs found</EmptyTitle>
            <EmptyDescription>
              {filters.status ||
              filters.brandId ||
              filters.subcategoryId ||
              filters.q ||
              filters.from ||
              filters.to
                ? "No logs match the current filters."
                : "Create your first task log to start tracking progress."}
            </EmptyDescription>
          </Empty>
        </div>
      ) : (
        <TaskLogTable logs={result.logs} showAssignee={false} />
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          buildHref={(target) => buildHref(filters, target)}
        />
      )}
    </div>
  );
}

function MyTasksSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-7 w-28" />
      </div>
      <div className="grid gap-2 rounded-lg border border-border p-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export const instant = false;

export default function MyTasksPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="My tasks"
        description="Your own task logs with personal progress."
        action={
          <div className="flex flex-wrap gap-2">
            <ExportTaskLogsButton />
            <Button
              render={<Link href="/tasks/new" />}
              nativeButton={false}
            >
              <PlusIcon data-icon="inline-start" />
              New task log
            </Button>
          </div>
        }
      />
      <Suspense fallback={<MyTasksSkeleton />}>
        <MyTasksContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
