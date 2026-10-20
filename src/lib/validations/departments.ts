import { z } from "zod";

export const departmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Department name is required.")
    .max(80, "Keep the department name under 80 characters."),
});

export const departmentIdSchema = z.object({
  id: z.uuid(),
});

/** Member → department assignment. `null` clears the department. */
export const memberDepartmentSchema = z.object({
  id: z.uuid(),
  department_id: z.uuid().nullable(),
});

/** Make/remove a Department Head for a department. */
export const setHeadSchema = z.object({
  id: z.uuid(),
  department_id: z.uuid(),
  makeHead: z.boolean(),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
