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
import {
  TaskFilters,
  type OptionItem,
  type TaskFilterValues,
} from "@/components/tasks/task-filters";
import { ExportTaskLogsButton } from "@/components/tasks/export-task-logs-button";
import { TaskLogTable } from "@/components/tasks/task-log-table";
import { CreatedFlash } from "@/components/tasks/created-flash";
import { MyProgressCards } from "@/components/metrics/my-progress-cards";
import { requireProfile } from "@/lib/auth";
import {
  TASK_LOG_PAGE_SIZE,
  getMyTaskStats,
  listTaskLogs,
  type MyTaskStats,
} from "@/lib/data/task-logs";
import {
  listBrands,
  listSubcategoriesWithLabels,
  listMembers,
} from "@/lib/data/masters";
import { TASK_STATUSES, type TaskStatus } from "@/lib/status";

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDateParam(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function parseFilters(params: Params): {
  filters: TaskFilterValues;
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
      assignedTo: first(params.assignee),
      q: first(params.q),
      from: parseDateParam(first(params.from)),
      to: parseDateParam(first(params.to)),
    },
    page: Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw,
  };
}

function buildHref(
  params: TaskFilterValues,
  page: number,
) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.brandId) search.set("brand", params.brandId);
  if (params.subcategoryId) search.set("category", params.subcategoryId);
  if (params.assignedTo) search.set("assignee", params.assignedTo);
  if (params.q) search.set("q", params.q);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `/tasks?${qs}` : "/tasks";
}

async function TaskListContent({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const params = await searchParams;
  const { filters, page } = parseFilters(params);
  const created = first(params.created) === "1";

  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";
  const canAssignOthers = isAdmin || profile.is_department_head;

  const [result, brands, subcategories, members, myStats]: [
    Awaited<ReturnType<typeof listTaskLogs>>,
    Awaited<ReturnType<typeof listBrands>>,
    Awaited<ReturnType<typeof listSubcategoriesWithLabels>>,
    Awaited<ReturnType<typeof listMembers>>,
    MyTaskStats | null,
  ] = await Promise.all([
    listTaskLogs(filters, page),
    listBrands(true),
    listSubcategoriesWithLabels(true),
    listMembers(),
    // Personal KPI cards for plain members only — here the list is already
    // their own. Admins and heads use /my-tasks for the personal view.
    !isAdmin && !profile.is_department_head ? getMyTaskStats() : Promise.resolve(null),
  ]);

  // Department Heads (and admins) see the assignee filter; RLS restricts
  // which logs and members a head can reach.
  const memberOptions: OptionItem[] = members.map((member) => ({
    label: member.full_name || member.email,
    value: member.id,
  }));

  const brandOptions: OptionItem[] = brands.map((brand) => ({
    label: brand.name,
    value: brand.id,
  }));
  const categoryOptions: OptionItem[] = subcategories.map((subcategory) => ({
    label: subcategory.label,
    value: subcategory.id,
  }));

  const totalPages = Math.max(
    1,
    Math.ceil(result.total / TASK_LOG_PAGE_SIZE),
  );

  return (
    <div className="grid gap-4">
      {created && <CreatedFlash />}
      {myStats && <MyProgressCards stats={myStats} />}
      <TaskFilters
        filters={filters}
        brandOptions={brandOptions}
        categoryOptions={categoryOptions}
        memberOptions={memberOptions}
        showAssigneeFilter={canAssignOthers}
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
              filters.assignedTo ||
              filters.q ||
              filters.from ||
              filters.to
                ? "No logs match the current filters."
                : "Create your first task log to start tracking progress."}
            </EmptyDescription>
          </Empty>
        </div>
      ) : (
        <TaskLogTable
          logs={result.logs}
          showAssignee={canAssignOthers}
          canDelete={canAssignOthers}
        />
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

function TaskListSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-7 w-28" />
      </div>
      <Skeleton className="h-4 w-24" />
      <div className="grid gap-2 rounded-lg border border-border p-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export const instant = false;

export default function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Tasks"
        description="Task logs — one row per task, brand, and assignee."
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
      <Suspense fallback={<TaskListSkeleton />}>
        <TaskListContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
