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
import { listCategoriesWithTasks } from "@/lib/data/masters";
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

async function CreateTaskContent() {
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";
  const categories = await listCategoriesWithTasks();

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
                      {category.tasks.length}{" "}
                      {category.tasks.length === 1 ? "task" : "tasks"}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3">
                  {category.short_description && (
                    <p className="text-muted-foreground mb-3">
                      {category.short_description}
                    </p>
                  )}
                  {category.tasks.length === 0 ? (
                    <p className="text-muted-foreground">
                      No tasks in this category yet.
                    </p>
                  ) : (
                    <ul className="divide-border divide-y rounded-md border border-border">
                      {category.tasks.map((task) => (
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
                              <ActionForm
                                action={toggleTaskActive.bind(null, task.id)}
                              >
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
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AddTaskDialog
                      categoryId={category.id}
                      categoryName={category.name}
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
        description="Add categories, then add tasks inside each category. Everyone can add; admins manage activation."
        action={<AddCategoryDialog />}
      />
      <Suspense fallback={<CreateTaskSkeleton />}>
        <CreateTaskContent />
      </Suspense>
    </div>
  );
}
