"use server";

import { revalidatePath } from "next/cache";
import { toast } from "sonner";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validations/masters";

export type MasterActionState = { error: string } | null;

export async function createCategory(
  _prevState: MasterActionState,
  formData: FormData,
): Promise<MasterActionState> {
  await requireProfile(); // any signed-in user may add categories

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    short_description: formData.get("short_description") || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({
    name: parsed.data.name,
    short_description: parsed.data.short_description ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "A category with this name already exists." };
    }
    return { error: `Could not create category: ${error.message}` };
  }

  toast.success("Category created.");
  revalidatePath("/categories");
  revalidatePath("/definitions");
  revalidatePath("/tasks");
  return null;
}

export async function toggleCategoryActive(id: string) {
  const profile = await requireProfile();
  if (profile.role !== "admin") return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("is_active, name")
    .eq("id", id)
    .single();

  if (error || !data) {
    toast.error("Category not found.");
    return;
  }

  const { error: updateError } = await supabase
    .from("categories")
    .update({ is_active: !data.is_active })
    .eq("id", id);

  if (updateError) {
    toast.error(`Could not update category: ${updateError.message}`);
    return;
  }

  toast.success(
    data.is_active ? "Category deactivated." : "Category activated.",
  );
  revalidatePath("/categories");
  revalidatePath("/definitions");
  revalidatePath("/tasks");
}
