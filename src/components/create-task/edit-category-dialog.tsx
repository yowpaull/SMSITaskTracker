"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
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
import { updateCategory, updateSubcategory } from "@/lib/actions/categories";

export function EditCategoryDialog({
  category,
  mainCategoryName,
  subcategory = false,
}: {
  category: {
    id: string;
    name: string;
    short_description: string | null;
  };
  /** Present when editing a subcategory (for the description text). */
  mainCategoryName?: string;
  subcategory?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("id", category.id);
    startTransition(async () => {
      const action = subcategory ? updateSubcategory : updateCategory;
      const result = await action(null, formData);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setError(null);
      toast.success(result?.success ?? "Saved.");
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
          <Button variant="outline" size="sm" className="text-muted-foreground">
            Edit
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {category.name}</DialogTitle>
          <DialogDescription>
            {subcategory
              ? `Subcategory under ${mainCategoryName}. Rename it or update its description.`
              : "Rename this category or update its description."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`edit-category-name-${category.id}`}>
                Name
              </FieldLabel>
              <Input
                id={`edit-category-name-${category.id}`}
                name="name"
                required
                defaultValue={category.name}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`edit-category-desc-${category.id}`}>
                Short description
              </FieldLabel>
              <Textarea
                id={`edit-category-desc-${category.id}`}
                name="short_description"
                rows={2}
                placeholder="Optional"
                defaultValue={category.short_description ?? ""}
              />
              <FieldDescription>
                Shown inside the category on this page.
              </FieldDescription>
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={pending} className="w-fit">
            {pending && <Spinner data-icon="inline-start" />}
            Save changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
