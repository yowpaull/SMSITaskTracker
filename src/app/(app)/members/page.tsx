import { Suspense } from "react";
import { connection } from "next/server";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { CreateMemberForm } from "@/components/members/create-member-form";
import { MemberRoleMenu } from "@/components/members/member-role-menu";
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
import { requireAdmin } from "@/lib/auth";
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

  const adminProfile = await requireAdmin();
  const { members, total } = await searchMembers(q, page);
  const totalPages = Math.max(1, Math.ceil(total / MEMBERS_PAGE_SIZE));
  const buildHref = (target: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (target > 1) sp.set("page", String(target));
    const qs = sp.toString();
    return qs ? `/members?${qs}` : "/members";
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">All members</CardTitle>
          <MemberSearch initialQuery={q ?? ""} />
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="text-muted-foreground text-sm">
              {q
                ? `No members match “${q}”.`
                : "No members yet."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
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
                        <MemberRoleMenu
                          memberId={member.id}
                          currentRole={member.role}
                          isActive={member.is_active}
                          isSelf={member.id === adminProfile.id}
                        />
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

export default function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Members"
        description="Admins create accounts, manage roles, and deactivate members. There is no self sign-up."
      />
      <Suspense fallback={<MembersSkeleton />}>
        <MembersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
