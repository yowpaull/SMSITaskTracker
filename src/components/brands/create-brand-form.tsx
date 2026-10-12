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
import { createBrand } from "@/lib/actions/brands";
import { useResultToast } from "@/hooks/use-result-toast";

export function CreateBrandForm() {
  const [state, formAction, pending] = useActionState(createBrand, null);
  useResultToast(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add brand</CardTitle>
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
              <FieldLabel htmlFor="brand-name">Name</FieldLabel>
              <Input
                id="brand-name"
                name="name"
                required
                placeholder="e.g. Acme Co"
              />
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={pending} className="w-fit">
            {pending && <Spinner data-icon="inline-start" />}
            Add brand
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
