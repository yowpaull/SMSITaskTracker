"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  categorySchema,
  categoryUpdateSchema,
  subcategorySchema,
  subcategoryUpdateSchema,
} from "@/lib/validations/masters";
import type { ActionResult } from "@/lib/actions/types";

export type MasterActionState = ActionResult;

function formDataValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value !== "" ? value : undefined;
}

function revalidateMasters() {
  revalidatePath("/create-task");
  revalidatePath("/tasks");
}

export async function createCategory(
  _prevState: MasterActionState,
  formData: FormData,
): Promise<MasterActionState> {
  await requireProfile();

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

  revalidateMasters();
  return { success: "Category created." };
}

export async function updateCategory(
  _prevState: MasterActionState,
  formData: FormData,
): Promise<MasterActionState> {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    return { error: "Only admins can edit categories." };
  }

  const parsed = categoryUpdateSchema.safeParse({
    id: formDataValue(formData, "id"),
    name: formData.get("name"),
    short_description: formData.get("short_description") || undefined,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      short_description: parsed.data.short_description ?? null,
    })
    .eq("id", parsed.data.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "A category with this name already exists." };
    }
    return { error: `Could not update category: ${error.message}` };
  }

  revalidateMasters();
  return { success: "Category updated." };
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

  revalidateMasters();
  return {
    success: data.is_active
      ? "Category deactivated."
      : "Category activated.",
  };
}

export async function createSubcategory(
  _prevState: MasterActionState,
  formData: FormData,
): Promise<MasterActionState> {
  await requireProfile();

  const parsed = subcategorySchema.safeParse({
    name: formData.get("name"),
    short_description: formData.get("short_description") || undefined,
    category_id: formDataValue(formData, "category_id"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("subcategories").insert({
    name: parsed.data.name,
    short_description: parsed.data.short_description ?? null,
    category_id: parsed.data.category_id,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "A subcategory with this name already exists here." };
    }
    return { error: `Could not create subcategory: ${error.message}` };
  }

  revalidateMasters();
  return { success: "Subcategory created." };
}

export async function updateSubcategory(
  _prevState: MasterActionState,
  formData: FormData,
): Promise<MasterActionState> {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    return { error: "Only admins can edit subcategories." };
  }

  const parsed = subcategoryUpdateSchema.safeParse({
    id: formDataValue(formData, "id"),
    name: formData.get("name"),
    short_description: formData.get("short_description") || undefined,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("subcategories")
    .update({
      name: parsed.data.name,
      short_description: parsed.data.short_description ?? null,
    })
    .eq("id", parsed.data.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "A subcategory with this name already exists here." };
    }
    return { error: `Could not update subcategory: ${error.message}` };
  }

  revalidateMasters();
  return { success: "Subcategory updated." };
}

export async function toggleSubcategoryActive(
  id: string,
): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    return { error: "Only admins can change subcategory status." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subcategories")
    .select("is_active, name")
    .eq("id", id)
    .single();

  if (error || !data) {
    return { error: "Subcategory not found." };
  }

  const { error: updateError } = await supabase
    .from("subcategories")
    .update({ is_active: !data.is_active })
    .eq("id", id);

  if (updateError) {
    return { error: `Could not update subcategory: ${updateError.message}` };
  }

  revalidateMasters();
  return {
    success: data.is_active
      ? "Subcategory deactivated."
      : "Subcategory activated.",
  };
}
