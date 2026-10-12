import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ActionForm } from "@/components/shared/action-form";
import { CreateBrandForm } from "@/components/brands/create-brand-form";
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
import { listBrands } from "@/lib/data/masters";
import { toggleBrandActive } from "@/lib/actions/brands";

async function BrandsContent() {
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";
  const brands = await listBrands();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All brands</CardTitle>
        </CardHeader>
        <CardContent>
          {brands.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No brands yet.
              {isAdmin
                ? " Add the first one."
                : " An admin must add a brand."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="w-28" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brands.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                      <TableCell>
                        {brand.is_active ? (
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
                          <ActionForm
                            action={toggleBrandActive.bind(null, brand.id)}
                          >
                            <Button type="submit" variant="outline" size="sm">
                              {brand.is_active ? "Deactivate" : "Activate"}
                            </Button>
                          </ActionForm>
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

      {isAdmin ? (
        <CreateBrandForm />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add brand</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Only admins can add or deactivate brands.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BrandsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" aria-busy="true">
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-28" />
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
          <Skeleton className="h-7 w-28" />
        </CardContent>
      </Card>
    </div>
  );
}

export const instant = false;

export default function BrandsPage() {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Brands"
        description="Task logs are recorded per brand. Admins manage the brand list."
      />
      <Suspense fallback={<BrandsSkeleton />}>
        <BrandsContent />
      </Suspense>
    </div>
  );
}
