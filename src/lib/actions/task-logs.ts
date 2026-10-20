"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createTaskLogSchema,
  deleteTaskLogSchema,
  formChecked,
  memberUpdateTaskLogSchema,
  parseDeadline,
  updateTaskLogSchema,
} from "@/lib/validations/task-log";
import type { TaskStatus } from "@/lib/status";
import type { ActionResult } from "@/lib/actions/types";

export type TaskLogActionState = ActionResult;

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
    deadline: formDataValue(formData, "deadline"),
    urgent: formChecked(formData, "urgent"),
    important: formChecked(formData, "important"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  // Admins and Department Heads may assign to others (RLS enforces that
  // heads only reach their own department's members); everyone else to self.
  const canAssignOthers =
    profile.role === "admin" || profile.is_department_head;
  const assignedTo = canAssignOthers
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
    deadline: parseDeadline(parsed.data.deadline),
  });

  if (error) {
    if (profile.is_department_head && profile.role !== "admin") {
      return {
        error:
          "Could not create task log. Department heads can only assign to members of their own department.",
      };
    }
    return { error: `Could not create task log: ${error.message}` };
  }

  // Redirect instead of returning a success state: a success value would
  // live on in the form's client state (Next.js preserves the hidden page
  // between visits) and replay the toast/redirect on the next visit.
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  redirect("/tasks?created=1");
}

export async function updateTaskLog(
  _prevState: TaskLogActionState,
  formData: FormData,
): Promise<TaskLogActionState> {
  const profile = await requireProfile();
  const isStaff = profile.role === "admin" || profile.is_department_head;

  const supabase = await createClient();

  // Plain members may only change the status of a log — every other field
  // stays as created/assigned (the DB trigger enforces the same rule).
  if (!isStaff) {
    const parsed = memberUpdateTaskLogSchema.safeParse({
      id: formDataValue(formData, "id"),
      status: formDataValue(formData, "status"),
    });
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Check the form values.",
      };
    }

    const status = parsed.data.status as TaskStatus;
    const completedAt =
      status === "completed" ? new Date().toISOString() : null;

    const { error } = await supabase
      .from("task_logs")
      .update({ status, completed_at: completedAt })
      .eq("id", parsed.data.id);

    if (error) {
      return { error: `Could not update task log: ${error.message}` };
    }

    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    revalidatePath(`/tasks/${parsed.data.id}`);
    revalidatePath(`/tasks/${parsed.data.id}/edit`);
    return { success: "Task log updated." };
  }

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

  const { error } = await supabase
    .from("task_logs")
    .update({
      task_id: parsed.data.task_id,
      brand_id: parsed.data.brand_id,
      ...(profile.role === "admin" ||
        (profile.is_department_head && parsed.data.assigned_to)
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

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath(`/tasks/${parsed.data.id}`);
  revalidatePath(`/tasks/${parsed.data.id}/edit`);
  return { success: "Task log updated." };
}

export async function deleteTaskLog(id: string): Promise<ActionResult> {
  const parsed = deleteTaskLogSchema.safeParse({ id });
  if (!parsed.success) {
    return { error: "Invalid task log." };
  }

  // Members never delete logs (not even their own); admins delete any,
  // heads their own logs plus logs of members in their department (RLS
  // enforces the row scope).
  const profile = await requireProfile();
  if (profile.role !== "admin" && !profile.is_department_head) {
    return {
      error: "Only admins and department heads can delete task logs.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_logs")
    .delete()
    .eq("id", parsed.data.id)
    .select("id");

  if (error) {
    return { error: `Could not delete task log: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return {
      error: "Task log not found or you don't have permission to delete it.",
    };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { success: "Task log deleted." };
}
