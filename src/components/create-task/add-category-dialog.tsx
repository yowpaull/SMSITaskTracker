"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createCategory } from "@/lib/actions/categories";

export function AddCategoryDialog({
  parentId,
  parentName,
}: {
  parentId?: string;
  parentName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isSubcategory = Boolean(parentId);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createCategory(null, formData);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setError(null);
      toast.success(result?.success ?? "Category created.");
      form.reset();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <PlusIcon data-icon="inline-start" />
            {isSubcategory ? "Add subcategory" : "Add category"}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isSubcategory ? "Add subcategory" : "Add category"}
          </DialogTitle>
          <DialogDescription>
            {isSubcategory
              ? `New subcategory under ${parentName}. Tasks can live in it or directly under ${parentName}.`
              : "Categories group related tasks, e.g. Marketing or Reporting."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {parentId && <input type="hidden" name="parent_id" value={parentId} />}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="category-name">Name</FieldLabel>
              <Input
                id="category-name"
                name="name"
                required
                placeholder={isSubcategory ? "e.g. Social media" : "e.g. Marketing"}
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
                Group related tasks under one category.
              </FieldDescription>
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={pending} className="w-fit">
            {pending && <Spinner data-icon="inline-start" />}
            {isSubcategory ? "Add subcategory" : "Add category"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
