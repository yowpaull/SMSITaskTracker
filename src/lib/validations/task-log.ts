import { z } from "zod";
import { TASK_STATUSES } from "@/lib/status";

export const taskLogStatusSchema = z.enum(TASK_STATUSES);

export const createTaskLogSchema = z.object({
  task_id: z.uuid("Pick a task definition."),
  brand_id: z.uuid("Pick a brand."),
  assigned_to: z.uuid().optional(),
  deadline: z.string().optional(),
  urgent: z.boolean(),
  important: z.boolean(),
});

export const updateTaskLogSchema = z.object({
  id: z.uuid(),
  task_id: z.uuid("Pick a task definition."),
  brand_id: z.uuid("Pick a brand."),
  assigned_to: z.uuid().optional(),
  status: taskLogStatusSchema,
  deadline: z.string().optional(),
  urgent: z.boolean(),
  important: z.boolean(),
});

export type CreateTaskLogInput = z.infer<typeof createTaskLogSchema>;
export type UpdateTaskLogInput = z.infer<typeof updateTaskLogSchema>;

export function parseDeadline(value: FormDataEntryValue | null | undefined) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function formChecked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}
