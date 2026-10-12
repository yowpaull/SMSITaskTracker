import { z } from "zod";

export const brandSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  short_description: z.string().trim().max(500).optional(),
});

export const taskDefinitionSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  category_id: z.uuid("Pick a category."),
});

export type BrandInput = z.infer<typeof brandSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type TaskDefinitionInput = z.infer<typeof taskDefinitionSchema>;
