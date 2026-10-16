import { z } from "zod";

export const memberRoleSchema = z.enum(["admin", "user"]);

export const createMemberSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128),
  full_name: z.string().trim().min(1, "Full name is required.").max(120),
  role: memberRoleSchema,
  department_id: z.uuid().nullable().optional(),
});

export const updateMemberRoleSchema = z.object({
  id: z.uuid(),
  role: memberRoleSchema,
});

export const memberIdSchema = z.object({
  id: z.uuid(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
