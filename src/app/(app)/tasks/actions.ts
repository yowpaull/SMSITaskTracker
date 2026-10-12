"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toast } from "sonner";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createTaskLogSchema,
  formChecked,
  parseDeadline,
  updateTaskLogSchema,
} from "@/lib/validations/task-log";
import type { TaskStatus } from "@/lib/status";

export type TaskLogActionState = { error: string } | null;

function formDataValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value !== "" ? value : undefined;
}

export async function createTaskLog(
  _prevState: TaskLogActionState,
  formData: FormData,
): Promise<TaskLogActionState> {
  const profile = await requireProfile();

  const parsed = createTaskLogSchema.safeParse({
    task_id: formDataValue(formData, "task_id"),
    brand_id: formDataValue(formData, "brand_id"),
    assigned_to: formDataValue(formData, "assigned_to"),
    deadline: parseDeadline(formData.get("deadline")) ?? undefined,
    urgent: formChecked(formData, "urgent"),
    important: formChecked(formData, "important"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  // Non-admins may only assign logs to themselves; RLS enforces the same.
  const assignedTo =
    profile.role === "admin"
      ? (parsed.data.assigned_to ?? profile.id)
      : profile.id;

  const supabase = await createClient();
  const { error } = await supabase.from("task_logs").insert({
    task_id: parsed.data.task_id,
    brand_id: parsed.data.brand_id,
    assigned_to: assignedTo,
    created_by: profile.id,
    status: "pending",
    urgent: parsed.data.urgent,
    important: parsed.data.important,
    deadline: parsed.data.deadline ?? null,
  });

  if (error) {
    return { error: `Could not create task log: ${error.message}` };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  redirect("/tasks");
}

export async function updateTaskLog(
  _prevState: TaskLogActionState,
  formData: FormData,
): Promise<TaskLogActionState> {
  const profile = await requireProfile();

  const parsed = updateTaskLogSchema.safeParse({
    id: formDataValue(formData, "id"),
    task_id: formDataValue(formData, "task_id"),
    brand_id: formDataValue(formData, "brand_id"),
    assigned_to: formDataValue(formData, "assigned_to"),
    status: formDataValue(formData, "status"),
    deadline: parseDeadline(formData.get("deadline")) ?? undefined,
    urgent: formChecked(formData, "urgent"),
    important: formChecked(formData, "important"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  const status = parsed.data.status as TaskStatus;
  const completedAt =
    status === "completed" ? new Date().toISOString() : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("task_logs")
    .update({
      task_id: parsed.data.task_id,
      brand_id: parsed.data.brand_id,
      ...(profile.role === "admin" && parsed.data.assigned_to
        ? { assigned_to: parsed.data.assigned_to }
        : {}),
      status,
      urgent: parsed.data.urgent,
      important: parsed.data.important,
      deadline: parsed.data.deadline ?? null,
      completed_at: completedAt,
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { error: `Could not update task log: ${error.message}` };
  }

  toast.success("Task log updated.");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath(`/tasks/${parsed.data.id}`);
  return null;
}
