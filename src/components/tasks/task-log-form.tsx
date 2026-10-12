"use client";

import Link from "next/link";
import { useEffect, useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { toDateInputValue } from "@/lib/format";
import { STATUS_LABELS, TASK_STATUSES, type TaskStatus } from "@/lib/status";
import type { OptionItem } from "@/components/tasks/task-filters";
import type { TaskLogActionState } from "@/lib/actions/task-logs";
import { useResultToast } from "@/hooks/use-result-toast";

type InitialLog = {
  id: string;
  task_id: string;
  brand_id: string;
  assigned_to: string;
  status: TaskStatus;
  urgent: boolean;
  important: boolean;
  deadline: string | null;
};

export function TaskLogForm({
  action,
  mode,
  isAdmin,
  brands,
  definitions,
  members,
  initial,
  defaultAssigneeId,
}: {
  action: (
    prevState: TaskLogActionState,
    formData: FormData,
  ) => Promise<TaskLogActionState>;
  mode: "create" | "update";
  isAdmin: boolean;
  brands: OptionItem[];
  definitions: OptionItem[];
  members: OptionItem[];
  initial?: InitialLog;
  defaultAssigneeId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const router = useRouter();
  useResultToast(state);

  useEffect(() => {
    if (mode === "create" && state?.success) {
      router.push("/tasks");
    }
  }, [state, mode, router]);
  const [taskId, setTaskId] = useState<string | null>(
    initial?.task_id ?? null,
  );
  const [brandId, setBrandId] = useState<string | null>(
    initial?.brand_id ?? null,
  );
  const [status, setStatus] = useState<TaskStatus | null>(
    initial?.status ?? (mode === "update" ? null : "pending"),
  );
  const [assigneeId, setAssigneeId] = useState<string | null>(
    initial?.assigned_to ?? defaultAssigneeId ?? null,
  );
  const [urgent, setUrgent] = useState(initial?.urgent ?? false);
  const [important, setImportant] = useState(initial?.important ?? false);

  const taskItems = [{ label: "Select a task…", value: null }, ...definitions];
  const brandItems = [{ label: "Select a brand…", value: null }, ...brands];
  const statusItems = TASK_STATUSES.map((value) => ({
    label: STATUS_LABELS[value],
    value: value as string | null,
  }));
  const assigneeItems = [
    { label: "Select a member…", value: null },
    ...members,
  ];

  const noDefinitions = definitions.length === 0;
  const noBrands = brands.length === 0;

  return (
    <form action={formAction} className="grid max-w-xl gap-4">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {mode === "update" && initial && (
        <input type="hidden" name="id" value={initial.id} />
      )}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="task-select">Task definition</FieldLabel>
          <Select
            items={taskItems}
            value={taskId}
            onValueChange={setTaskId}
            disabled={noDefinitions}
          >
            <SelectTrigger id="task-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {taskItems.map((item) => (
                  <SelectItem key={item.value ?? "placeholder"} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <input type="hidden" name="task_id" value={taskId ?? ""} />
          {noDefinitions && (
            <p className="text-destructive text-xs">
              No active tasks yet. Add one on the Create Task page first.
            </p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="brand-select">Brand</FieldLabel>
          <Select
            items={brandItems}
            value={brandId}
            onValueChange={setBrandId}
            disabled={noBrands}
          >
            <SelectTrigger id="brand-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {brandItems.map((item) => (
                  <SelectItem key={item.value ?? "placeholder"} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <input type="hidden" name="brand_id" value={brandId ?? ""} />
          {noBrands && (
            <p className="text-destructive text-xs">
              No active brands. Ask an admin to add one on the Brands page.
            </p>
          )}
        </Field>

        {mode === "update" && (
          <Field>
            <FieldLabel htmlFor="status-select">Status</FieldLabel>
            <Select
              items={statusItems}
              value={status}
              onValueChange={(value) =>
                setStatus((value as TaskStatus | null) ?? null)
              }
            >
              <SelectTrigger id="status-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {statusItems.map((item) => (
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
            <input type="hidden" name="status" value={status ?? ""} />
          </Field>
        )}

        {isAdmin && (
          <Field>
            <FieldLabel htmlFor="assignee-select">Assign to</FieldLabel>
            <Select
              items={assigneeItems}
              value={assigneeId}
              onValueChange={setAssigneeId}
            >
              <SelectTrigger id="assignee-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {assigneeItems.map((item) => (
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
            <input type="hidden" name="assigned_to" value={assigneeId ?? ""} />
            {mode === "create" && (
              <p className="text-muted-foreground text-xs">
                Leave as yourself to create a personal log.
              </p>
            )}
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="deadline">Deadline (optional)</FieldLabel>
          <Input
            id="deadline"
            name="deadline"
            type="date"
            defaultValue={toDateInputValue(initial?.deadline)}
          />
        </Field>

        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="urgent"
              checked={urgent}
              onCheckedChange={(checked) => setUrgent(Boolean(checked))}
            />
            <Label htmlFor="urgent" className="font-normal text-sm">
              Urgent
            </Label>
            <input type="hidden" name="urgent" value={urgent ? "on" : ""} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="important"
              checked={important}
              onCheckedChange={(checked) => setImportant(Boolean(checked))}
            />
            <Label htmlFor="important" className="font-normal text-sm">
              Important
            </Label>
            <input
              type="hidden"
              name="important"
              value={important ? "on" : ""}
            />
          </div>
        </div>
      </FieldGroup>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          {mode === "create" ? "Create task log" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          render={<Link href="/tasks" />}
          nativeButton={false}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
