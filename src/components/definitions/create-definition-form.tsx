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
import type { OptionItem } from "@/components/tasks/task-filters";
import { createTaskDefinition } from "@/app/(app)/definitions/actions";

export function CreateDefinitionForm({
  categoryOptions,
}: {
  categoryOptions: OptionItem[];
}) {
  const [state, formAction, pending] = useActionState(
    createTaskDefinition,
    null,
  );
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const items = [
    { label: "Select a category…", value: null },
    ...categoryOptions,
  ];

  if (categoryOptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add task definition</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Add a category first — every definition belongs to one.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add task definition</CardTitle>
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
              <FieldLabel htmlFor="definition-name">Task name</FieldLabel>
              <Input
                id="definition-name"
                name="name"
                required
                placeholder="e.g. Publish weekly report"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="definition-category">Category</FieldLabel>
              <Select
                items={items}
                value={categoryId}
                onValueChange={setCategoryId}
              >
                <SelectTrigger id="definition-category" className="w-full">
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
              <input type="hidden" name="category_id" value={categoryId ?? ""} />
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={pending} className="w-fit">
            {pending && <Spinner data-icon="inline-start" />}
            Add definition
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
