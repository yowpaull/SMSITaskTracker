"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validations/masters";
import type { ActionResult } from "@/lib/actions/types";

export type MasterActionState = ActionResult;

function formDataValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value !== "" ? value : undefined;
}

export async function createCategory(
  _prevState: MasterActionState,
  formData: FormData,
): Promise<MasterActionState> {
  await requireProfile();

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    short_description: formData.get("short_description") || undefined,
    parent_id: formDataValue(formData, "parent_id"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  const supabase = await createClient();

  if (parsed.data.parent_id) {
    const { data: parent, error: parentError } = await supabase
      .from("categories")
      .select("id, parent_id")
      .eq("id", parsed.data.parent_id)
      .single();
    if (parentError || !parent) {
      return { error: "Main category not found." };
    }
    if (parent.parent_id !== null) {
      return {
        error: "Subcategories can only be added under a main category.",
      };
    }
  }

  const { error } = await supabase.from("categories").insert({
    name: parsed.data.name,
    short_description: parsed.data.short_description ?? null,
    parent_id: parsed.data.parent_id ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "A category with this name already exists here." };
    }
    return { error: `Could not create category: ${error.message}` };
  }

  revalidatePath("/create-task");
  revalidatePath("/tasks");
  return { success: "Category created." };
}

export async function toggleCategoryActive(
  id: string,
): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    return { error: "Only admins can change category status." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("is_active, name")
    .eq("id", id)
    .single();

  if (error || !data) {
    return { error: "Category not found." };
  }

  const { error: updateError } = await supabase
    .from("categories")
    .update({ is_active: !data.is_active })
    .eq("id", id);

  if (updateError) {
    return { error: `Could not update category: ${updateError.message}` };
  }

  revalidatePath("/create-task");
  revalidatePath("/tasks");
  return {
    success: data.is_active
      ? "Category deactivated."
      : "Category activated.",
  };
}
