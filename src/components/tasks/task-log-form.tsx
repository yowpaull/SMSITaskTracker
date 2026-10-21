"use client";

import Link from "next/link";
import {
  useActionState,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toDateInputValue } from "@/lib/format";
import { STATUS_LABELS, TASK_STATUSES, type TaskStatus } from "@/lib/status";
import {
  countLetters,
  REMARKS_MAX_LETTERS,
} from "@/lib/validations/task-log";
import type { OptionItem } from "@/components/tasks/task-filters";
import type { TaskOption, TaskPickGroup } from "@/lib/types";
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
  remarks: string | null;
};

/** Locate which main category / subcategory a task belongs to (for edit mode). */
function findTaskLocation(
  taskId: string | null,
  groups: TaskPickGroup[],
): { mainId: string | null; subId: string | null } {
  if (!taskId) return { mainId: null, subId: null };
  for (const group of groups) {
    for (const subcategory of group.subcategories) {
      if (subcategory.tasks.some((task) => task.value === taskId)) {
        return { mainId: group.mainCategoryId, subId: subcategory.id };
      }
    }
  }
  return { mainId: null, subId: null };
}

export function TaskLogForm({
  action,
  mode,
  canAssignOthers,
  statusOnly = false,
  brands,
  taskGroups,
  members,
  initial,
  defaultAssigneeId,
  cancelHref = "/tasks",
}: {
  action: (
    prevState: TaskLogActionState,
    formData: FormData,
  ) => Promise<TaskLogActionState>;
  mode: "create" | "update";
  canAssignOthers: boolean;
  /** Plain members: render only status + remarks (all other fields locked). */
  statusOnly?: boolean;
  brands: OptionItem[];
  taskGroups: TaskPickGroup[];
  members: OptionItem[];
  initial?: InitialLog;
  defaultAssigneeId?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  useResultToast(state);

  const formRef = useRef<HTMLFormElement>(null);

  const initialLocation = findTaskLocation(
    initial?.task_id ?? null,
    taskGroups,
  );

  const [mainCategoryId, setMainCategoryId] = useState<string | null>(
    initialLocation.mainId,
  );
  const [subCategoryId, setSubCategoryId] = useState<string | null>(
    initialLocation.subId,
  );
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
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");

  // Next.js keeps this page mounted (hidden) between navigations, so a
  // create-mode form would reappear with last visit's selections. Start
  // each visit fresh (the create action now redirects on success).
  useLayoutEffect(() => {
    if (mode !== "create") return;
    // Native reset() is universally supported; React 19 also resets
    // useActionState when the form fires a reset event.
    const form = formRef.current;
    return () => {
      form?.reset();
      setMainCategoryId(null);
      setSubCategoryId(null);
      setTaskId(null);
      setBrandId(null);
      setStatus("pending");
      setAssigneeId(defaultAssigneeId ?? null);
      setUrgent(false);
      setImportant(false);
      setRemarks("");
    };
  }, [mode, defaultAssigneeId]);

  // Main category → subcategory → task cascade. Only the task itself is
  // submitted; the first two selects just narrow the task list.
  const selectedGroup =
    taskGroups.find((group) => group.mainCategoryId === mainCategoryId) ??
    null;

  function onMainCategoryChange(value: string | null) {
    setMainCategoryId(value);
    setSubCategoryId(null);
    setTaskId(null);
  }

  function onSubCategoryChange(value: string | null) {
    setSubCategoryId(value);
    setTaskId(null);
  }

  const mainItems = [
    { label: "Select a category…", value: null },
    ...taskGroups.map((group) => ({
      label: group.mainCategoryName,
      value: group.mainCategoryId as string | null,
    })),
  ];
  const subItems = [
    { label: "Select a subcategory…", value: null },
    ...(selectedGroup?.subcategories.map((subcategory) => ({
      label: subcategory.name,
      value: subcategory.id as string | null,
    })) ?? []),
  ];
  const taskOptions: TaskOption[] = !selectedGroup || !subCategoryId
    ? []
    : (selectedGroup.subcategories.find((sub) => sub.id === subCategoryId)
        ?.tasks ?? []);

  const taskItems = [
    { label: "Select a task…", value: null },
    ...taskOptions,
  ];
  const brandItems = [{ label: "Select a brand…", value: null }, ...brands];
  const statusItems = TASK_STATUSES.map((value) => ({
    label: STATUS_LABELS[value],
    value: value as string | null,
  }));
  const assigneeItems = [
    { label: "Select a member…", value: null },
    ...members,
  ];

  const noDefinitions = taskGroups.length === 0;
  const noBrands = brands.length === 0;
  // The task dropdown stays locked until a subcategory is chosen explicitly.
  const taskReady = Boolean(mainCategoryId) && subCategoryId !== null;
  const letters = countLetters(remarks);
  const overLimit = letters > REMARKS_MAX_LETTERS;

  return (
    <form ref={formRef} action={formAction} className="grid max-w-xl gap-4">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {mode === "update" && initial && (
        <input type="hidden" name="id" value={initial.id} />
      )}

      <FieldGroup>
        {!statusOnly && (
          <>
            <Field>
              <FieldLabel htmlFor="main-category-select">Main category</FieldLabel>
          <Select
            items={mainItems}
            value={mainCategoryId}
            onValueChange={onMainCategoryChange}
            disabled={noDefinitions}
          >
            <SelectTrigger id="main-category-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {mainItems.map((item) => (
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
          {noDefinitions && (
            <p className="text-destructive text-xs">
              No active tasks yet. Add one on the Create Task page first.
            </p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="sub-category-select">Sub category</FieldLabel>
          <Select
            items={subItems}
            value={subCategoryId}
            onValueChange={onSubCategoryChange}
            disabled={!mainCategoryId}
          >
            <SelectTrigger id="sub-category-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {subItems.map((item) => (
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

        <Field>
          <FieldLabel htmlFor="task-select">Task</FieldLabel>
          <Select
            items={taskItems}
            value={taskId}
            onValueChange={setTaskId}
            disabled={!taskReady}
          >
            <SelectTrigger id="task-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {taskItems.map((item) => (
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
          <input type="hidden" name="task_id" value={taskId ?? ""} />
          {mainCategoryId && !taskReady && (
            <p className="text-muted-foreground text-xs">
              Select a sub category to continue.
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
              No active brands. Ask an admin to add one.
            </p>
          )}
        </Field>
          </>
        )}

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

        {canAssignOthers && (
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

        {!statusOnly && (
          <>
        <Field>
          <FieldLabel htmlFor="deadline">
            {mode === "create" ? "Deadline" : "Deadline"}
          </FieldLabel>
          <Input
            id="deadline"
            name="deadline"
            type="date"
            required={mode === "create"}
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
          </>
        )}

        {/* Remarks: everyone's notes/links field — even in status-only
            member mode, where it is one of the two editable fields. */}
        <Field>
          <FieldLabel htmlFor="remarks">Remarks</FieldLabel>
          <Textarea
            id="remarks"
            name="remarks"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Notes, links, context… (optional)"
            rows={4}
            maxLength={REMARKS_MAX_LETTERS}
            className="max-h-48"
            aria-invalid={overLimit || undefined}
            aria-describedby="remarks-letter-count"
          />
          <p
            id="remarks-letter-count"
            aria-live="polite"
            className={`text-right text-xs tabular-nums ${
              overLimit ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {letters} / {REMARKS_MAX_LETTERS} letters
          </p>
        </Field>
      </FieldGroup>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || overLimit}>
          {pending && <Spinner data-icon="inline-start" />}
          {mode === "create" ? "Create task log" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          render={<Link href={cancelHref} />}
          nativeButton={false}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
