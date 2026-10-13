import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ActionForm } from "@/components/shared/action-form";
import { AddCategoryDialog } from "@/components/create-task/add-category-dialog";
import { AddTaskDialog } from "@/components/create-task/add-task-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireProfile } from "@/lib/auth";
import { listCategoryHierarchy, type TaskLite } from "@/lib/data/masters";
import { toggleCategoryActive } from "@/lib/actions/categories";
import { toggleTaskActive } from "@/lib/actions/task-definitions";

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge
      variant="secondary"
      className="border-transparent bg-success/10 text-success"
    >
      Active
    </Badge>
  ) : (
    <Badge
      variant="secondary"
      className="border-transparent bg-muted text-muted-foreground"
    >
      Inactive
    </Badge>
  );
}

function TaskRows({ tasks, isAdmin }: { tasks: TaskLite[]; isAdmin: boolean }) {
  if (tasks.length === 0) {
    return <p className="text-muted-foreground text-sm">No tasks yet.</p>;
  }
  return (
    <ul className="divide-border divide-y rounded-md border border-border">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex items-center justify-between gap-3 px-3 py-2"
        >
          <span
            className={
              task.is_active
                ? "font-medium"
                : "text-muted-foreground font-medium line-through"
            }
          >
            {task.name}
          </span>
          <span className="flex items-center gap-2">
            <StatusBadge isActive={task.is_active} />
            {isAdmin && (
              <ActionForm action={toggleTaskActive.bind(null, task.id)}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-7 px-2 text-xs"
                >
                  {task.is_active ? "Deactivate" : "Activate"}
                </Button>
              </ActionForm>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function TaskSection({
  title,
  isActive,
  tasks,
  categoryId,
  categoryName,
  isAdmin,
}: {
  title: string;
  /** Undefined for a main category's own task list (the main toggles above). */
  isActive?: boolean;
  tasks: TaskLite[];
  categoryId: string;
  categoryName: string;
  isAdmin: boolean;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-medium text-sm">{title}</span>
          {isActive !== undefined && <StatusBadge isActive={isActive} />}
          <span className="text-muted-foreground text-xs font-normal">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <AddTaskDialog categoryId={categoryId} categoryName={categoryName} />
          {isAdmin && isActive !== undefined && (
            <ActionForm action={toggleCategoryActive.bind(null, categoryId)}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-7 px-2 text-xs"
              >
                {isActive ? "Deactivate" : "Activate"}
              </Button>
            </ActionForm>
          )}
        </span>
      </div>
      <TaskRows tasks={tasks} isAdmin={isAdmin} />
    </div>
  );
}

async function CreateTaskContent() {
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";
  const categories = await listCategoryHierarchy();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Categories</CardTitle>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No categories yet. Add the first one to start adding tasks.
          </p>
        ) : (
          <Accordion className="rounded-lg border-border">
            {categories.map((category) => (
              <AccordionItem key={category.id} value={category.id}>
                <AccordionTrigger className="px-3 py-3 text-sm hover:no-underline">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="font-medium">{category.name}</span>
                    <StatusBadge isActive={category.is_active} />
                    <span className="text-muted-foreground text-xs font-normal">
                      {category.taskCount}{" "}
                      {category.taskCount === 1 ? "task" : "tasks"}
                      {" · "}
                      {category.subcategories.length}{" "}
                      {category.subcategories.length === 1
                        ? "subcategory"
                        : "subcategories"}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3">
                  {category.short_description && (
                    <p className="text-muted-foreground mb-3">
                      {category.short_description}
                    </p>
                  )}
                  {category.subcategories.length === 0 &&
                  category.directTasks.length === 0 ? (
                    <p className="text-muted-foreground">
                      No subcategories or tasks in this category yet.
                    </p>
                  ) : (
                    <div className="grid gap-3">
                      {category.subcategories.map((subcategory) => (
                        <TaskSection
                          key={subcategory.id}
                          title={subcategory.name}
                          isActive={subcategory.is_active}
                          tasks={subcategory.tasks}
                          categoryId={subcategory.id}
                          categoryName={subcategory.name}
                          isAdmin={isAdmin}
                        />
                      ))}
                      {category.directTasks.length > 0 && (
                        <TaskSection
                          title="No subcategory"
                          tasks={category.directTasks}
                          categoryId={category.id}
                          categoryName={category.name}
                          isAdmin={isAdmin}
                        />
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AddCategoryDialog
                      parentId={category.id}
                      parentName={category.name}
                    />
                    {isAdmin && (
                      <ActionForm
                        action={toggleCategoryActive.bind(null, category.id)}
                      >
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className="text-muted-foreground"
                        >
                          {category.is_active
                            ? "Deactivate category"
                            : "Activate category"}
                        </Button>
                      </ActionForm>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

function CreateTaskSkeleton() {
  return (
    <Card aria-busy="true">
      <CardHeader>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="grid gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export const instant = false;

export default function CreateTaskPage() {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Create Task"
        description="Main categories → subcategories → tasks. Everyone can add; only admins can edit or deactivate."
        action={<AddCategoryDialog />}
      />
      <Suspense fallback={<CreateTaskSkeleton />}>
        <CreateTaskContent />
      </Suspense>
    </div>
  );
}
