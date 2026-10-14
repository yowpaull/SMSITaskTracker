import { z } from "zod";

export const brandSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  short_description: z.string().trim().max(500).optional(),
});

export const subcategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  short_description: z.string().trim().max(500).optional(),
  category_id: z.uuid("Pick a main category."),
});

export const taskDefinitionSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  subcategory_id: z.uuid("Pick a sub category."),
});

export const categoryUpdateSchema = categorySchema.extend({
  id: z.uuid("Missing category."),
});

export const subcategoryUpdateSchema = subcategorySchema.omit({
  category_id: true,
}).extend({
  id: z.uuid("Missing subcategory."),
});

export const taskDefinitionUpdateSchema = taskDefinitionSchema.extend({
  id: z.uuid("Missing task."),
});

export type BrandInput = z.infer<typeof brandSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type SubcategoryInput = z.infer<typeof subcategorySchema>;
export type TaskDefinitionInput = z.infer<typeof taskDefinitionSchema>;
