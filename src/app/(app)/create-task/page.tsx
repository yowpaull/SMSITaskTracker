import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ActionForm } from "@/components/shared/action-form";
import { AddCategoryDialog } from "@/components/create-task/add-category-dialog";
import { AddTaskDialog } from "@/components/create-task/add-task-dialog";
import { EditCategoryDialog } from "@/components/create-task/edit-category-dialog";
import { EditTaskDialog } from "@/components/create-task/edit-task-dialog";
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
import {
  listCategoryHierarchy,
  listSubcategoriesWithLabels,
  type TaskLite,
} from "@/lib/data/masters";
import {
  toggleCategoryActive,
  toggleSubcategoryActive,
} from "@/lib/actions/categories";
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

function TaskRows({
  tasks,
  isAdmin,
  subcategoryOptions,
}: {
  tasks: TaskLite[];
  isAdmin: boolean;
  subcategoryOptions: { label: string; value: string }[];
}) {
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
              <>
                <EditTaskDialog
                  task={task}
                  subcategoryOptions={subcategoryOptions}
                />
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
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SubcategorySection({
  subcategory,
  mainCategoryName,
  isAdmin,
  subcategoryOptions,
}: {
  subcategory: {
    id: string;
    name: string;
    short_description: string | null;
    is_active: boolean;
    tasks: TaskLite[];
  };
  mainCategoryName: string;
  isAdmin: boolean;
  subcategoryOptions: { label: string; value: string }[];
}) {
  return (
    <div className="grid gap-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-medium text-sm">{subcategory.name}</span>
          <StatusBadge isActive={subcategory.is_active} />
          <span className="text-muted-foreground text-xs font-normal">
            {subcategory.tasks.length}{" "}
            {subcategory.tasks.length === 1 ? "task" : "tasks"}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <AddTaskDialog
            subcategoryId={subcategory.id}
            subcategoryName={subcategory.name}
          />
          {isAdmin && (
            <>
              <EditCategoryDialog
                subcategory
                category={{
                  id: subcategory.id,
                  name: subcategory.name,
                  short_description: subcategory.short_description,
                }}
                mainCategoryName={mainCategoryName}
              />
              <ActionForm
                action={toggleSubcategoryActive.bind(null, subcategory.id)}
              >
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-7 px-2 text-xs"
                >
                  {subcategory.is_active ? "Deactivate" : "Activate"}
                </Button>
              </ActionForm>
            </>
          )}
        </span>
      </div>
      <TaskRows
        tasks={subcategory.tasks}
        isAdmin={isAdmin}
        subcategoryOptions={subcategoryOptions}
      />
    </div>
  );
}

async function CreateTaskContent() {
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";
  const [categories, subcategories] = await Promise.all([
    listCategoryHierarchy(),
    listSubcategoriesWithLabels(),
  ]);
  const subcategoryOptions = subcategories.map((subcategory) => ({
    label: subcategory.label,
    value: subcategory.id,
  }));

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
                  {category.subcategories.length === 0 ? (
                    <p className="text-muted-foreground">
                      No subcategories in this category yet. Add one to start
                      adding tasks.
                    </p>
                  ) : (
                    <div className="grid gap-3">
                      {category.subcategories.map((subcategory) => (
                        <SubcategorySection
                          key={subcategory.id}
                          subcategory={subcategory}
                          mainCategoryName={category.name}
                          isAdmin={isAdmin}
                          subcategoryOptions={subcategoryOptions}
                        />
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AddCategoryDialog
                      categoryId={category.id}
                      categoryName={category.name}
                    />
                    {isAdmin && (
                      <EditCategoryDialog
                        category={{
                          id: category.id,
                          name: category.name,
                          short_description: category.short_description,
                        }}
                      />
                    )}
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
