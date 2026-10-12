import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { PlusIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
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
import { TaskLogTable } from "@/components/tasks/task-log-table";
import { requireProfile } from "@/lib/auth";
import {
  TASK_LOG_PAGE_SIZE,
  listTaskLogs,
} from "@/lib/data/task-logs";
import { listBrands, listCategories, listMembers } from "@/lib/data/masters";
import { TASK_STATUSES, type TaskStatus } from "@/lib/status";

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
      categoryId: first(params.category),
      assignedTo: first(params.assignee),
      q: first(params.q),
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
  if (params.categoryId) search.set("category", params.categoryId);
  if (params.assignedTo) search.set("assignee", params.assignedTo);
  if (params.q) search.set("q", params.q);
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `/tasks?${qs}` : "/tasks";
}

async function TaskListContent({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const params = await searchParams;
  const { filters, page } = parseFilters(params);

  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";

  const [result, brands, categories, members] = await Promise.all([
    listTaskLogs(filters, page),
    listBrands(true),
    listCategories(true),
    listMembers(),
  ]);

  // Non-admins only see their own logs; the assignee filter is hidden for them.
  const memberOptions: OptionItem[] = members.map((member) => ({
    label: member.full_name || member.email,
    value: member.id,
  }));

  const brandOptions: OptionItem[] = brands.map((brand) => ({
    label: brand.name,
    value: brand.id,
  }));
  const categoryOptions: OptionItem[] = categories.map((category) => ({
    label: category.name,
    value: category.id,
  }));

  const totalPages = Math.max(
    1,
    Math.ceil(result.total / TASK_LOG_PAGE_SIZE),
  );

  return (
    <div className="grid gap-4">
      <TaskFilters
        filters={filters}
        brandOptions={brandOptions}
        categoryOptions={categoryOptions}
        memberOptions={memberOptions}
        showAssigneeFilter={isAdmin}
      />

      {result.logs.length === 0 ? (
        <div className="rounded-lg border border-border">
          <Empty>
            <EmptyTitle>No task logs found</EmptyTitle>
            <EmptyDescription>
              {filters.status ||
              filters.brandId ||
              filters.categoryId ||
              filters.assignedTo ||
              filters.q
                ? "No logs match the current filters."
                : "Create your first task log to start tracking progress."}
            </EmptyDescription>
          </Empty>
        </div>
      ) : (
        <TaskLogTable logs={result.logs} showAssignee={isAdmin} />
      )}

      {result.total > TASK_LOG_PAGE_SIZE && (
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span>
            Page {page} of {totalPages} · {result.total} logs
          </span>
          <span className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              nativeButton={false}
              render={
                <Link
                  href={
                    page <= 1
                      ? "/tasks"
                      : buildHref(filters, page - 1)
                  }
                />
              }
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              nativeButton={false}
              render={
                <Link
                  href={
                    page >= totalPages
                      ? "/tasks"
                      : buildHref(filters, page + 1)
                  }
                />
              }
            >
              Next
            </Button>
          </span>
        </div>
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
          <Button
            render={<Link href="/tasks/new" />}
            nativeButton={false}
          >
            <PlusIcon data-icon="inline-start" />
            New task log
          </Button>
        }
      />
      <Suspense fallback={<TaskListSkeleton />}>
        <TaskListContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
