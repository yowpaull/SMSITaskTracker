import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { CreateMemberForm } from "@/components/members/create-member-form";
import { DepartmentFilter } from "@/components/members/department-filter";
import { MemberSearch } from "@/components/members/member-search";
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
import { requireStaffProfile } from "@/lib/auth";
import { listDepartments } from "@/lib/data/departments";
import { MEMBERS_PAGE_SIZE, searchMembers } from "@/lib/data/masters";
import { formatDate } from "@/lib/format";

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function MembersContent({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const params = await searchParams;
  const q = first(params.q) || undefined;
  const pageRaw = Number.parseInt(first(params.page) ?? "1", 10);
  const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;

  const viewer = await requireStaffProfile();
  const isAdmin = viewer.role === "admin";

  const departmentParam = first(params.department) || undefined;
  // Heads always see their own department; admins may filter by any.
  const departmentFilter: string | "unassigned" | undefined = isAdmin
    ? departmentParam
    : (viewer.department_id ?? "unassigned");

  const [departments, { members, total }] = await Promise.all([
    listDepartments(),
    searchMembers(q, page, departmentFilter),
  ]);

  const departmentNameById = new Map(
    departments.map((department) => [department.id, department.name]),
  );

  const totalPages = Math.max(1, Math.ceil(total / MEMBERS_PAGE_SIZE));
  const buildHref = (target: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (isAdmin && departmentParam) sp.set("department", departmentParam);
    if (target > 1) sp.set("page", String(target));
    const qs = sp.toString();
    return qs ? `/members?${qs}` : "/members";
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            {isAdmin ? "All members" : "Your department"}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <DepartmentFilter
                departments={departments}
                value={departmentParam ?? "all"}
                query={q}
              />
            )}
            <MemberSearch initialQuery={q ?? ""} />
          </div>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="text-muted-foreground text-sm">
              {q
                ? `No members match “${q}”.`
                : isAdmin
                  ? "No members yet."
                  : "No members in your department yet."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
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
                        <div className="flex flex-wrap items-center gap-1">
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
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.department_id
                          ? (departmentNameById.get(member.department_id) ??
                            "—")
                          : "Unassigned"}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(member.created_at)}
                      </TableCell>
                      <TableCell>
                        {member.id === viewer.id ? (
                          <span className="text-muted-foreground text-xs">
                            It&apos;s you
                          </span>
                        ) : (
                          <Link
                            href={`/members/${member.id}`}
                            aria-label={`Manage ${member.full_name || member.email}`}
                            className="font-medium text-xs underline-offset-4 hover:underline"
                          >
                            Manage
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              buildHref={buildHref}
            />
          </div>
        </CardContent>
      </Card>

      <CreateMemberForm
        departments={departments.map((department) => ({
          id: department.id,
          name: department.name,
        }))}
        viewerIsAdmin={isAdmin}
        viewerDepartmentId={viewer.department_id}
      />
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

export default function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Members"
        description="Admins manage every account, department, and role. Department Heads manage their own members. There is no self sign-up."
      />
      <Suspense fallback={<MembersSkeleton />}>
        <MembersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
