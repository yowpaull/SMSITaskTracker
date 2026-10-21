import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/shared/back-button";
import { LinkifiedText } from "@/components/shared/linkified-text";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge, OverdueBadge } from "@/components/tasks/status-badge";
import { TaskLogForm } from "@/components/tasks/task-log-form";
import { requireProfile } from "@/lib/auth";
import { getTaskLog } from "@/lib/data/task-logs";
import {
  listBrands,
  listMembers,
  listTaskPickGroups,
} from "@/lib/data/masters";
import { formatDateTime } from "@/lib/format";
import { updateTaskLog } from "@/lib/actions/task-logs";

async function TaskLogEditContent({
  idPromise,
}: {
  idPromise: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await idPromise;
  const log = await getTaskLog(id);
  if (!log) notFound();

  const profile = await requireProfile();
  const canAssignOthers =
    profile.role === "admin" || profile.is_department_head;
  // Plain members may only change the status — every other field is locked.
  const statusOnly = !canAssignOthers;

  const [brands, taskGroups, members] = await Promise.all([
    statusOnly ? Promise.resolve([]) : listBrands(),
    statusOnly ? Promise.resolve([]) : listTaskPickGroups(),
    statusOnly ? Promise.resolve([]) : listMembers(),
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Edit task log"
        description={
          statusOnly
            ? "Update the status or remarks of this task log. All other fields are locked."
            : "Update status, priority, deadline, assignment, or remarks."
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid gap-4">
          <TaskLogForm
            action={updateTaskLog}
            mode="update"
            canAssignOthers={canAssignOthers}
            statusOnly={statusOnly}
            initial={log}
            cancelHref="/tasks"
            brands={brands.map((brand) => ({
              label: brand.name,
              value: brand.id,
            }))}
            taskGroups={taskGroups}
            members={members.map((member) => ({
              label: member.full_name || member.email,
              value: member.id,
            }))}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
            <CardDescription>
              <StatusBadge status={log.status} />
              <OverdueBadge status={log.status} deadline={log.deadline} />
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Task</p>
              <p>{log.task?.name ?? "Unknown task"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Category</p>
              <p>
                {log.task?.subcategory
                  ? log.task.subcategory.category
                    ? `${log.task.subcategory.category.name} / ${log.task.subcategory.name}`
                    : log.task.subcategory.name
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Brand</p>
              <p>{log.brand?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Assignee</p>
              <p>
                {log.assignee?.full_name ||
                  log.assignee?.email ||
                  "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Remarks</p>
              <p className="whitespace-pre-wrap">
                {log.remarks ? <LinkifiedText text={log.remarks} /> : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Completed at</p>
              <p>{formatDateTime(log.completed_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Created</p>
              <p>{formatDateTime(log.created_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last updated</p>
              <p>{formatDateTime(log.updated_at)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <div className="grid gap-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid max-w-xl gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="grid gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-full" />
            </div>
          ))}
          <Skeleton className="h-8 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent className="grid gap-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const instant = false;

export default function TaskLogEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="grid gap-4">
      <BackButton href="/tasks" label="Back to tasks" />
      <Suspense fallback={<DetailSkeleton />}>
        <TaskLogEditContent idPromise={params} />
      </Suspense>
    </div>
  );
}
