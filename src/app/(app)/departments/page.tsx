import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ActionForm } from "@/components/shared/action-form";
import { CreateDepartmentForm } from "@/components/departments/create-department-form";
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
import { listDepartments } from "@/lib/data/departments";
import { listMembers } from "@/lib/data/masters";
import { toggleDepartmentActive } from "@/lib/actions/departments";

async function DepartmentsContent() {
  const [departments, members] = await Promise.all([
    listDepartments(),
    listMembers(),
  ]);

  const headsByDepartment = new Map<string, string[]>();
  const memberCounts = new Map<string | null, number>();
  for (const member of members) {
    if (member.department_id) {
      const count = memberCounts.get(member.department_id) ?? 0;
      memberCounts.set(member.department_id, count + 1);
      if (member.is_department_head) {
        const heads = headsByDepartment.get(member.department_id) ?? [];
        heads.push(member.full_name || member.email);
        headsByDepartment.set(member.department_id, heads);
      }
    } else {
      memberCounts.set(null, (memberCounts.get(null) ?? 0) + 1);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All departments</CardTitle>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No departments yet. Add the first one.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead>Head(s)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((department) => (
                    <TableRow key={department.id}>
                      <TableCell className="font-medium">
                        {department.name}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {memberCounts.get(department.id) ?? 0}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {(headsByDepartment.get(department.id) ?? []).join(
                          ", ",
                        ) || "—"}
                      </TableCell>
                      <TableCell>
                        {department.is_active ? (
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
                      <TableCell>
                        <ActionForm
                          action={toggleDepartmentActive.bind(
                            null,
                            department.id,
                          )}
                        >
                          <Button type="submit" variant="outline" size="sm">
                            {department.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </ActionForm>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-muted-foreground mt-3 text-xs">
            {memberCounts.get(null)
              ? `${memberCounts.get(null)} member(s) are Unassigned. Set their department from the Members page.`
              : "Assign members to departments from the Members page; promote heads there too."}
          </p>
        </CardContent>
      </Card>

      <CreateDepartmentForm />
    </div>
  );
}

function DepartmentsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" aria-busy="true">
      <Card>
        <Skeleton className="h-4 w-28" />
        <CardContent className="grid gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
      <Card>
        <Skeleton className="h-4 w-24" />
        <CardContent className="grid gap-3">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-28" />
        </CardContent>
      </Card>
    </div>
  );
}

export const instant = false;

export default async function DepartmentsPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/tasks");

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Departments"
        description="Group members into departments. Department Heads manage and view their own members; admins see everything."
      />
      <Suspense fallback={<DepartmentsSkeleton />}>
        <DepartmentsContent />
      </Suspense>
    </div>
  );
}
