import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/shared/back-button";
import { PageHeader } from "@/components/shared/page-header";
import { PriorityBadges } from "@/components/tasks/priority-badges";
import { StatusBadge } from "@/components/tasks/status-badge";
import { getTaskLog } from "@/lib/data/task-logs";
import { formatDate, formatDateTime } from "@/lib/format";

async function TaskLogViewContent({
  idPromise,
}: {
  idPromise: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await idPromise;
  const log = await getTaskLog(id);
  if (!log) notFound();

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Task log"
        description="View task log details and history."
        action={
          <Button
            render={<Link href={`/tasks/${log.id}/edit`} />}
            nativeButton={false}
          >
            Edit
          </Button>
        }
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">
            {log.task?.name ?? "Unknown task"}
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <StatusBadge status={log.status} deadline={log.deadline} />
            <PriorityBadges
              urgent={log.urgent}
              important={log.important}
            />
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
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
            <p className="text-muted-foreground text-xs">Deadline</p>
            <p>{formatDate(log.deadline)}</p>
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

function ViewSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="grid gap-3">
          {Array.from({ length: 7 }).map((_, index) => (
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
      <BackButton href="/tasks" label="Back to tasks" />
      <Suspense fallback={<ViewSkeleton />}>
        <TaskLogViewContent idPromise={params} />
      </Suspense>
    </div>
  );
}
