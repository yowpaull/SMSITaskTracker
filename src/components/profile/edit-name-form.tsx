"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { updateFullName } from "@/lib/actions/profile";
import { useResultToast } from "@/hooks/use-result-toast";

export function EditNameForm({ initialFullName }: { initialFullName: string }) {
  const [state, formAction, pending] = useActionState(updateFullName, null);
  useResultToast(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Edit name</CardTitle>
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
              <FieldLabel htmlFor="profile-full-name">Full name</FieldLabel>
              <Input
                id="profile-full-name"
                name="full_name"
                required
                defaultValue={initialFullName}
                placeholder="e.g. Jane Doe"
              />
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={pending} className="w-fit">
            {pending && <Spinner data-icon="inline-start" />}
            Save name
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
