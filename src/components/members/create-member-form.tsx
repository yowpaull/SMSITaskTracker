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

export function CreateMemberForm() {
  const [state, formAction, pending] = useActionState(createMember, null);
  const [role, setRole] = useState<string | null>("user");
  useResultToast(state);

  const items = [{ label: "Select a role…", value: null }, ...ROLE_ITEMS];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add member</CardTitle>
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
            <Field>
              <FieldLabel htmlFor="member-role">Role</FieldLabel>
              <Select
                items={items}
                value={role}
                onValueChange={setRole}
              >
                <SelectTrigger id="member-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {items.map((item) => (
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
