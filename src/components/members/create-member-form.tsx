"use client";

import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { createMember } from "@/lib/actions/members";
import { useResultToast } from "@/hooks/use-result-toast";

const ROLE_ITEMS = [
  { label: "Member", value: "user" },
  { label: "Admin", value: "admin" },
];

const NO_DEPARTMENT = "none";

type DepartmentOption = { id: string; name: string };

export function CreateMemberForm({
  departments,
  viewerIsAdmin,
  viewerDepartmentId,
}: {
  departments: DepartmentOption[];
  viewerIsAdmin: boolean;
  viewerDepartmentId: string | null;
}) {
  const [state, formAction, pending] = useActionState(createMember, null);
  const [role, setRole] = useState<string | null>("user");
  const [department, setDepartment] = useState<string | null>(
    viewerIsAdmin ? NO_DEPARTMENT : (viewerDepartmentId ?? NO_DEPARTMENT),
  );
  useResultToast(state);

  const [lastResult, setLastResult] = useState(state);
  if (state !== lastResult) {
    setLastResult(state);
    if (state?.success) {
      setRole("user");
      setDepartment(
        viewerIsAdmin ? NO_DEPARTMENT : (viewerDepartmentId ?? NO_DEPARTMENT),
      );
    }
  }

  const roleItems = [
    { label: "Select a role…", value: null },
    ...ROLE_ITEMS,
  ];
  const departmentItems = [
    { label: "No department", value: NO_DEPARTMENT },
    ...departments.map((d) => ({ label: d.name, value: d.id })),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add member</CardTitle>
        {!viewerIsAdmin && (
          <p className="text-muted-foreground text-sm">
            New members are added to your department.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="member-name">Full name</FieldLabel>
              <Input
                id="member-name"
                name="full_name"
                required
                placeholder="e.g. Jane Doe"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="member-email">Email</FieldLabel>
              <Input
                id="member-email"
                name="email"
                type="email"
                required
                placeholder="jane@example.com"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="member-password">Temporary password</FieldLabel>
              <Input
                id="member-password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-muted-foreground text-xs">
                At least 8 characters. Share it with the member so they can
                sign in.
              </p>
            </Field>
            {viewerIsAdmin ? (
              <Field>
                <FieldLabel htmlFor="member-role">Role</FieldLabel>
                <Select
                  items={roleItems}
                  value={role}
                  onValueChange={setRole}
                >
                  <SelectTrigger id="member-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {roleItems.map((item) => (
                        <SelectItem
                          key={item.value ?? "placeholder"}
                          value={item.value}
                        >
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <input type="hidden" name="role" value={role ?? ""} />
              </Field>
            ) : (
              <input type="hidden" name="role" value="user" />
            )}
            {viewerIsAdmin ? (
              <Field>
                <FieldLabel htmlFor="member-department">Department</FieldLabel>
                <Select
                  items={departmentItems}
                  value={department}
                  onValueChange={setDepartment}
                >
                  <SelectTrigger id="member-department" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {departmentItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <input
                  type="hidden"
                  name="department_id"
                  value={
                    department && department !== NO_DEPARTMENT ? department : ""
                  }
                />
              </Field>
            ) : (
              <input
                type="hidden"
                name="department_id"
                value={viewerDepartmentId ?? ""}
              />
            )}
          </FieldGroup>
          <Button type="submit" disabled={pending} className="w-fit">
            {pending && <Spinner data-icon="inline-start" />}
            Create member
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
