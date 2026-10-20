import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BackButton } from "@/components/shared/back-button";
import { PageHeader } from "@/components/shared/page-header";
import { ManageAccountCard } from "@/components/members/manage-account-card";
import { ManageDepartmentCard } from "@/components/members/manage-department-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaffProfile } from "@/lib/auth";
import { listDepartments } from "@/lib/data/departments";
import { getMemberById } from "@/lib/data/masters";
import { formatDate } from "@/lib/format";

async function ManageMemberContent({
  memberIdPromise,
}: {
  memberIdPromise: Promise<{ memberId: string }>;
}) {
  await connection();
  const { memberId } = await memberIdPromise;

  const viewer = await requireStaffProfile();
  const isAdmin = viewer.role === "admin";

  const member = await getMemberById(memberId);
  if (!member) notFound();

  // Heads may only manage members of their own department.
  if (
    !isAdmin &&
    (!viewer.is_department_head ||
      member.department_id !== viewer.department_id)
  ) {
    redirect("/members");
  }

  const isSelf = member.id === viewer.id;

  const departments = await listDepartments();
  const departmentName = member.department_id
    ? (departments.find((d) => d.id === member.department_id)?.name ?? "—")
    : "Unassigned";

  return (
    <div className="grid gap-4">
      <PageHeader
        title={member.full_name || "Member"}
        description="Manage this member's account, role, and department."
      />
      <Card className="max-w-2xl" aria-label="Member summary">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>{member.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm">
          {member.role === "admin" ? (
            <Badge
              variant="secondary"
              className="border-transparent bg-primary/10 text-primary"
            >
              Admin
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="border-transparent bg-secondary text-secondary-foreground"
            >
              Member
            </Badge>
          )}
          {member.is_department_head && (
            <Badge
              variant="secondary"
              className="border-transparent bg-warning/10 text-warning"
            >
              Head
            </Badge>
          )}
          {member.is_active ? (
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
              Deactivated
            </Badge>
          )}
          <span className="text-muted-foreground">
            {departmentName} · Joined {formatDate(member.created_at)}
          </span>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <ManageAccountCard
          memberId={member.id}
          currentRole={member.role}
          isActive={member.is_active}
          isSelf={isSelf}
          viewerIsAdmin={isAdmin}
        />
        {isAdmin && !isSelf && (
          <ManageDepartmentCard
            memberId={member.id}
            departmentId={member.department_id}
            isHead={member.is_department_head}
            departments={departments.map((department) => ({
              id: department.id,
              name: department.name,
            }))}
          />
        )}
      </div>
    </div>
  );
}

function ManageMemberSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <Skeleton className="h-7 w-40" />
      <Card className="max-w-2xl">
        <CardHeader>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-36" />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="grid gap-3">
              {Array.from({ length: 2 }).map((_, row) => (
                <Skeleton key={row} className="h-8 w-full max-w-xs" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export const instant = false;

export default function ManageMemberPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  return (
    <div className="grid gap-4">
      <BackButton href="/members" label="Back to members" />
      <Suspense fallback={<ManageMemberSkeleton />}>
        <ManageMemberContent memberIdPromise={params} />
      </Suspense>
    </div>
  );
}
