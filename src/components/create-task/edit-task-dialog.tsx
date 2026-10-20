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
import { updateTaskDefinition } from "@/lib/actions/task-definitions";

export function EditTaskDialog({
  task,
  subcategoryOptions,
}: {
  task: { id: string; name: string; subcategory_id: string };
  subcategoryOptions: { label: string; value: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [subcategoryId, setSubcategoryId] = useState<string | null>(
    task.subcategory_id,
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("id", task.id);
    startTransition(async () => {
      const result = await updateTaskDefinition(null, formData);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setError(null);
      toast.success(result?.success ?? "Task updated.");
      setOpen(false);
    });
  }

  const items = [
    { label: "Select a subcategory…", value: null },
    ...subcategoryOptions.map((option) => ({
      label: option.label,
      value: option.value as string | null,
    })),
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setError(null);
          setSubcategoryId(task.subcategory_id);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-7 px-2 text-xs"
          >
            Edit
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>
            Rename the task or move it to another subcategory.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <input type="hidden" name="subcategory_id" value={subcategoryId ?? ""} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`edit-task-name-${task.id}`}>
                Task name
              </FieldLabel>
              <Input
                id={`edit-task-name-${task.id}`}
                name="name"
                required
                defaultValue={task.name}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`edit-task-subcategory-${task.id}`}>
                Subcategory
              </FieldLabel>
              <Select
                items={items}
                value={subcategoryId}
                onValueChange={setSubcategoryId}
              >
                <SelectTrigger
                  id={`edit-task-subcategory-${task.id}`}
                  className="w-full"
                >
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
            </Field>
          </FieldGroup>
          <Button
            type="submit"
            disabled={pending || !subcategoryId}
            className="w-fit"
          >
            {pending && <Spinner data-icon="inline-start" />}
            Save changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
