import { Suspense } from "react";
import {
  Empty,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { TaskLogForm } from "@/components/tasks/task-log-form";
import { requireProfile } from "@/lib/auth";
import {
  listBrands,
  listCategories,
  listMembers,
  listTaskDefinitions,
  groupDefinitionsByCategory,
} from "@/lib/data/masters";
import { createTaskLog } from "@/lib/actions/task-logs";

async function NewTaskLogContent() {
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";

  const [brands, categories, definitions, members] = await Promise.all([
    listBrands(true),
    listCategories(true),
    listTaskDefinitions(true),
    isAdmin ? listMembers() : Promise.resolve([]),
  ]);

  if (brands.length === 0) {
    return (
      <Empty>
        <EmptyTitle>No active brands</EmptyTitle>
        <EmptyDescription>
          An admin must add a brand on the Brands page before task logs can
          be created.
        </EmptyDescription>
      </Empty>
    );
  }

  if (categories.length === 0) {
    return (
      <Empty>
        <EmptyTitle>No active categories</EmptyTitle>
        <EmptyDescription>
          Add a category on the Categories page, then create a task
          definition.
        </EmptyDescription>
      </Empty>
    );
  }

  if (definitions.length === 0) {
    return (
      <Empty>
        <EmptyTitle>No active task definitions</EmptyTitle>
        <EmptyDescription>
          Add a task definition on the Definitions page before creating a
          task log.
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <TaskLogForm
      action={createTaskLog}
      mode="create"
      isAdmin={isAdmin}
      defaultAssigneeId={profile.id}
      brands={brands.map((brand) => ({ label: brand.name, value: brand.id }))}
      definitionGroups={groupDefinitionsByCategory(definitions)}
      members={members.map((member) => ({
        label: member.full_name || member.email,
        value: member.id,
      }))}
    />
  );
}

function FormSkeleton() {
  return (
    <div className="grid max-w-xl gap-4" aria-busy="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="grid gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-full" />
        </div>
      ))}
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

export const instant = false;

export default function NewTaskLogPage() {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="New task log"
        description="Track a task definition for a brand and assignee."
      />
      <Suspense fallback={<FormSkeleton />}>
        <NewTaskLogContent />
      </Suspense>
    </div>
  );
}
