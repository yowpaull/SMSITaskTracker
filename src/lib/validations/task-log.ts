import { z } from "zod";
import { TASK_STATUSES } from "@/lib/status";

export const taskLogStatusSchema = z.enum(TASK_STATUSES);

export const REMARKS_MAX_LETTERS = 1000;

/** Shared letter count for the form counter and schema validation: trimmed
 *  code-point length (spaces and punctuation count too). Matches Postgres
 *  char_length on the stored, trimmed value, so the zod validation and the
 *  task_logs_remarks_letter_limit DB check enforce the same cap. */
export function countLetters(text: string): number {
  return [...text.trim()].length;
}

// Free text (links allowed). Accepts null/undefined for a blank field and
// normalizes to a trimmed string or null; capped at REMARKS_MAX_LETTERS.
export const remarksSchema = z
  .string()
  .superRefine((value, ctx) => {
    const letters = countLetters(value);
    if (letters > REMARKS_MAX_LETTERS) {
      ctx.addIssue({
        code: "custom",
        message: `Remarks must be ${REMARKS_MAX_LETTERS} letters or fewer (currently ${letters}).`,
      });
    }
  })
  .nullable()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
  });

export const createTaskLogSchema = z.object({
  task_id: z.uuid("Pick a task definition."),
  brand_id: z.uuid("Pick a brand."),
  assigned_to: z.uuid().optional(),
  deadline: z
    .string("Pick a deadline.")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a deadline."),
  urgent: z.boolean(),
  important: z.boolean(),
  remarks: remarksSchema,
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
  remarks: remarksSchema,
});

// Plain members may only change the status and remarks of a log — every
// other field (task, brand, assignee, deadline, priority) is locked after
// creation.
export const memberUpdateTaskLogSchema = z.object({
  id: z.uuid(),
  status: taskLogStatusSchema,
  remarks: remarksSchema,
});

export const deleteTaskLogSchema = z.object({
  id: z.uuid(),
});

export type CreateTaskLogInput = z.infer<typeof createTaskLogSchema>;
export type UpdateTaskLogInput = z.infer<typeof updateTaskLogSchema>;
export type MemberUpdateTaskLogInput = z.infer<
  typeof memberUpdateTaskLogSchema
>;

export function parseDeadline(value: FormDataEntryValue | null | undefined) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function formChecked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}
