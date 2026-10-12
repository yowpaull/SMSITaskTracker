"use client";

import { useActionState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCategory } from "@/app/(app)/categories/actions";

export function CreateCategoryForm() {
  const [state, formAction, pending] = useActionState(createCategory, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add category</CardTitle>
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
              <FieldLabel htmlFor="category-name">Name</FieldLabel>
              <Input
                id="category-name"
                name="name"
                required
                placeholder="e.g. Marketing"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="category-description">
                Short description
              </FieldLabel>
              <Textarea
                id="category-description"
                name="short_description"
                rows={2}
                placeholder="Optional"
              />
              <FieldDescription>
                Group related task definitions under one category.
              </FieldDescription>
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={pending} className="w-fit">
            {pending && <Spinner data-icon="inline-start" />}
            Add category
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
