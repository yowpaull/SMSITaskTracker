"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  taskDefinitionSchema,
  taskDefinitionUpdateSchema,
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

export async function createTaskDefinition(
  _prevState: MasterActionState,
  formData: FormData,
): Promise<MasterActionState> {
  await requireProfile();

  const parsed = taskDefinitionSchema.safeParse({
    name: formDataValue(formData, "name"),
    subcategory_id: formDataValue(formData, "subcategory_id"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    name: parsed.data.name,
    subcategory_id: parsed.data.subcategory_id,
  });

  if (error) {
    return { error: `Could not create task: ${error.message}` };
  }

  revalidateMasters();
  return { success: "Task created." };
}

export async function updateTaskDefinition(
  _prevState: MasterActionState,
  formData: FormData,
): Promise<MasterActionState> {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    return { error: "Only admins can edit tasks." };
  }

  const parsed = taskDefinitionUpdateSchema.safeParse({
    id: formDataValue(formData, "id"),
    name: formDataValue(formData, "name"),
    subcategory_id: formDataValue(formData, "subcategory_id"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      name: parsed.data.name,
      subcategory_id: parsed.data.subcategory_id,
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { error: `Could not update task: ${error.message}` };
  }

  revalidateMasters();
  return { success: "Task updated." };
}

export async function toggleTaskActive(id: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    return { error: "Only admins can change task status." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("is_active")
    .eq("id", id)
    .single();

  if (error || !data) {
    return { error: "Task not found." };
  }

  const { error: updateError } = await supabase
    .from("tasks")
    .update({ is_active: !data.is_active })
    .eq("id", id);

  if (updateError) {
    return { error: `Could not update task: ${updateError.message}` };
  }

  revalidateMasters();
  return {
    success: data.is_active ? "Task deactivated." : "Task activated.",
  };
}
