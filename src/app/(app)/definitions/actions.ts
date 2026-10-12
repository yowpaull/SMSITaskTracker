"use server";

import { revalidatePath } from "next/cache";
import { toast } from "sonner";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { taskDefinitionSchema } from "@/lib/validations/masters";

export type MasterActionState = { error: string } | null;

function formDataValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value !== "" ? value : undefined;
}

export async function createTaskDefinition(
  _prevState: MasterActionState,
  formData: FormData,
): Promise<MasterActionState> {
  await requireProfile(); // both roles may add definitions

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
    return { error: `Could not create task definition: ${error.message}` };
  }

  toast.success("Task definition created.");
  revalidatePath("/definitions");
  revalidatePath("/tasks");
  return null;
}

export async function toggleTaskDefinitionActive(id: string) {
  const profile = await requireProfile();
  if (profile.role !== "admin") return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("is_active")
    .eq("id", id)
    .single();

  if (error || !data) {
    toast.error("Task definition not found.");
    return;
  }

  const { error: updateError } = await supabase
    .from("tasks")
    .update({ is_active: !data.is_active })
    .eq("id", id);

  if (updateError) {
    toast.error(`Could not update task: ${updateError.message}`);
    return;
  }

  toast.success(
    data.is_active ? "Task definition deactivated." : "Task definition activated.",
  );
  revalidatePath("/definitions");
  revalidatePath("/tasks");
}
