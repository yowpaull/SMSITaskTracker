import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { CreateMemberForm } from "@/components/members/create-member-form";
import { MemberRoleMenu } from "@/components/members/member-role-menu";
import { Badge } from "@/components/ui/badge";
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
import { requireAdmin } from "@/lib/auth";
import { listMembers } from "@/lib/data/masters";
import { formatDate } from "@/lib/format";

async function MembersContent() {
  const adminProfile = await requireAdmin();
  const members = await listMembers();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All members</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-sm">No members yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.full_name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.email}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(member.created_at)}
                      </TableCell>
                      <TableCell>
                        <MemberRoleMenu
                          memberId={member.id}
                          currentRole={member.role}
                          isSelf={member.id === adminProfile.id}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateMemberForm />
    </div>
  );
}

function MembersSkeleton() {
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
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-7 w-full" />
          ))}
          <Skeleton className="h-7 w-28" />
        </CardContent>
      </Card>
    </div>
  );
}

export const instant = false;

export default function MembersPage() {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Members"
        description="Admins create accounts and manage roles. There is no self sign-up."
      />
      <Suspense fallback={<MembersSkeleton />}>
        <MembersContent />
      </Suspense>
    </div>
  );
}
