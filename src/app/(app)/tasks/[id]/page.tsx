import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/tasks/status-badge";
import { TaskLogForm } from "@/components/tasks/task-log-form";
import { requireProfile } from "@/lib/auth";
import { getTaskLog } from "@/lib/data/task-logs";
import {
  listBrands,
  listMembers,
  listTaskDefinitions,
} from "@/lib/data/masters";
import { formatDateTime } from "@/lib/format";
import { updateTaskLog } from "@/lib/actions/task-logs";

async function TaskLogDetailContent({
  idPromise,
}: {
  idPromise: Promise<{ id: string }>;
}) {
  const { id } = await idPromise;
  const log = await getTaskLog(id);
  if (!log) notFound();

  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";

  const [brands, definitions, members] = await Promise.all([
    listBrands(),
    listTaskDefinitions(),
    isAdmin ? listMembers() : Promise.resolve([]),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="grid gap-4">
        <TaskLogForm
          action={updateTaskLog}
          mode="update"
          isAdmin={isAdmin}
          initial={log}
          brands={brands.map((brand) => ({
            label: brand.name,
            value: brand.id,
          }))}
          definitions={definitions.map((definition) => ({
            label: definition.category
              ? `${definition.name} · ${definition.category.name}`
              : definition.name,
            value: definition.id,
          }))}
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
            <StatusBadge status={log.status} deadline={log.deadline} />
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Task</p>
            <p>{log.task?.name ?? "Unknown task"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Category</p>
            <p>{log.task?.category?.name ?? "—"}</p>
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
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" aria-busy="true">
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
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export const instant = false;

export default function TaskLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Task log"
        description="Update status, priority, deadline, or assignment."
      />
      <Suspense fallback={<DetailSkeleton />}>
        <TaskLogDetailContent idPromise={params} />
      </Suspense>
    </div>
  );
}
