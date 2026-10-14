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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createTaskDefinition } from "@/lib/actions/task-definitions";

export function AddTaskDialog({
  subcategoryId,
  subcategoryName,
}: {
  subcategoryId: string;
  subcategoryName: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createTaskDefinition(null, formData);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setError(null);
      toast.success(result?.success ?? "Task created.");
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
          <Button variant="outline" size="sm">
            <PlusIcon data-icon="inline-start" />
            Add task
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add task</DialogTitle>
          <DialogDescription>New task in {subcategoryName}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <input type="hidden" name="subcategory_id" value={subcategoryId} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`task-name-${subcategoryId}`}>
                Task name
              </FieldLabel>
              <Input
                id={`task-name-${subcategoryId}`}
                name="name"
                required
                placeholder="e.g. Publish weekly report"
              />
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={pending} className="w-fit">
            {pending && <Spinner data-icon="inline-start" />}
            Add task
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
