"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { taskDefinitionSchema } from "@/lib/validations/masters";
import type { ActionResult } from "@/lib/actions/types";

export type MasterActionState = ActionResult;

function formDataValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value !== "" ? value : undefined;
}

export async function createTaskDefinition(
  _prevState: MasterActionState,
  formData: FormData,
): Promise<MasterActionState> {
  await requireProfile();

  const parsed = taskDefinitionSchema.safeParse({
    name: formDataValue(formData, "name"),
    category_id: formDataValue(formData, "category_id"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    name: parsed.data.name,
    category_id: parsed.data.category_id,
  });

  if (error) {
    return { error: `Could not create task: ${error.message}` };
  }

  revalidatePath("/create-task");
  revalidatePath("/tasks");
  return { success: "Task created." };
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

  revalidatePath("/create-task");
  revalidatePath("/tasks");
  return {
    success: data.is_active ? "Task deactivated." : "Task activated.",
  };
}
