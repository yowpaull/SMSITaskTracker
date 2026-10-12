import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { CreateDefinitionForm } from "@/components/definitions/create-definition-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireProfile } from "@/lib/auth";
import {
  listCategories,
  listTaskDefinitions,
  type TaskDefinitionWithCategory,
} from "@/lib/data/masters";
import { toggleTaskDefinitionActive } from "./actions";

async function DefinitionsContent() {
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";

  const [definitions, categories] = await Promise.all([
    listTaskDefinitions(),
    listCategories(true),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All definitions</CardTitle>
        </CardHeader>
        <CardContent>
          {definitions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No task definitions yet. Add the first one.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="w-28" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {definitions.map(
                    (definition: TaskDefinitionWithCategory) => (
                      <TableRow key={definition.id}>
                        <TableCell className="font-medium">
                          {definition.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {definition.category?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          {definition.is_active ? (
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
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <form
                              action={toggleTaskDefinitionActive.bind(
                                null,
                                definition.id,
                              )}
                            >
                              <Button type="submit" variant="outline" size="sm">
                                {definition.is_active
                                  ? "Deactivate"
                                  : "Activate"}
                              </Button>
                            </form>
                          </TableCell>
                        )}
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateDefinitionForm
        categoryOptions={categories.map((category) => ({
          label: category.name,
          value: category.id,
        }))}
      />
    </div>
  );
}

function DefinitionsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" aria-busy="true">
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="grid gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="grid gap-3">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-28" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function DefinitionsPage() {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Definitions"
        description="Reusable task templates. Everyone can add one; admins manage them."
      />
      <Suspense fallback={<DefinitionsSkeleton />}>
        <DefinitionsContent />
      </Suspense>
    </div>
  );
}
