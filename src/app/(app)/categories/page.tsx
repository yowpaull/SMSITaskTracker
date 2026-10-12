import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { CreateCategoryForm } from "@/components/categories/create-category-form";
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
import { listCategories } from "@/lib/data/masters";
import { toggleCategoryActive } from "./actions";

async function CategoriesContent() {
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";
  const categories = await listCategories();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All categories</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No categories yet. Add the first one.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="w-28" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        {category.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {category.short_description ?? "—"}
                      </TableCell>
                      <TableCell>
                        {category.is_active ? (
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
                            action={toggleCategoryActive.bind(
                              null,
                              category.id,
                            )}
                          >
                            <Button type="submit" variant="outline" size="sm">
                              {category.is_active ? "Deactivate" : "Activate"}
                            </Button>
                          </form>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCategoryForm />
    </div>
  );
}

function CategoriesSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" aria-busy="true">
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="grid gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="grid gap-3">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-7 w-28" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Categories"
        description="Categories classify task definitions. Everyone can add one; admins manage them."
      />
      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesContent />
      </Suspense>
    </div>
  );
}
