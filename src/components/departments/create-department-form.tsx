"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createDepartment } from "@/lib/actions/departments";
import { useResultToast } from "@/hooks/use-result-toast";

export function CreateDepartmentForm() {
  const [state, formAction, pending] = useActionState(createDepartment, null);
  useResultToast(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add department</CardTitle>
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
              <FieldLabel htmlFor="department-name">Name</FieldLabel>
              <Input
                id="department-name"
                name="name"
                required
                placeholder="e.g. Marketing"
              />
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={pending} className="w-fit">
            {pending && <Spinner data-icon="inline-start" />}
            Add department
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
