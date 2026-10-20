"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  departmentIdSchema,
  departmentSchema,
  memberDepartmentSchema,
  setHeadSchema,
} from "@/lib/validations/departments";
import type { ActionResult } from "@/lib/actions/types";

export type DepartmentActionState = ActionResult;

export async function createDepartment(
  _prevState: DepartmentActionState,
  formData: FormData,
): Promise<DepartmentActionState> {
  await requireAdmin();

  const parsed = departmentSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .insert({ name: parsed.data.name });

  if (error) {
    if (error.code === "23505") {
      return { error: "A department with this name already exists." };
    }
    return { error: `Could not create department: ${error.message}` };
  }

  revalidatePath("/departments");
  revalidatePath("/members");
  revalidatePath("/dashboard");
  return { success: "Department created." };
}

export async function toggleDepartmentActive(
  id: string,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = departmentIdSchema.safeParse({ id });
  if (!parsed.success) {
    return { error: "Invalid department." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .select("is_active, name")
    .eq("id", parsed.data.id)
    .single();

  if (error || !data) {
    return { error: "Department not found." };
  }

  const { error: updateError } = await supabase
    .from("departments")
    .update({ is_active: !data.is_active })
    .eq("id", parsed.data.id);

  if (updateError) {
    return { error: `Could not update department: ${updateError.message}` };
  }

  revalidatePath("/departments");
  revalidatePath("/members");
  revalidatePath("/dashboard");
  return {
    success: data.is_active
      ? "Department deactivated. Its members keep the assignment."
      : "Department activated.",
  };
}

/**
 * Assign a member to a department (or clear with null). Admins may target
 * anyone; Department Heads may only move members INTO their own department.
 * profiles updates by heads go through the service client because the RLS
 * update policy on profiles is admin-only (RLS cannot restrict columns).
 */
export async function setMemberDepartment(
  id: string,
  departmentId: string | null,
): Promise<ActionResult> {
  const profile = await requireProfile();
  const parsed = memberDepartmentSchema.safeParse({
    id,
    department_id: departmentId,
  });
  if (!parsed.success) {
    return { error: "Invalid department assignment." };
  }

  const isAdmin = profile.role === "admin";
  const isOwnDept =
    profile.is_department_head &&
    profile.department_id !== null &&
    parsed.data.department_id === profile.department_id;

  if (!isAdmin && !isOwnDept) {
    return {
      error: "You can only move members into your own department.",
    };
  }

  const update: { department_id: string | null; is_department_head?: boolean } = {
    department_id: parsed.data.department_id,
  };

  // Look up the target so a head flag is cleared when someone leaves their
  // department (profiles_head_requires_department check).
  let target: { id: string; is_department_head: boolean } | null = null;
  if (isAdmin) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, is_department_head")
      .eq("id", parsed.data.id)
      .maybeSingle();
    target = data;
    if (!target) return { error: "Member not found." };
    if (target.is_department_head) update.is_department_head = false;
    const { error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", parsed.data.id);
    if (error) {
      return { error: `Could not update member: ${error.message}` };
    }
  } else {
    let admin: ReturnType<typeof createAdminClient>;
    try {
      admin = createAdminClient();
    } catch (err) {
      return {
        error:
          err instanceof Error
            ? err.message
            : "Admin client is not configured. Set SUPABASE_SECRET_KEY in .env.local.",
      };
    }
    const { data } = await admin
      .from("profiles")
      .select("id, is_department_head")
      .eq("id", parsed.data.id)
      .maybeSingle();
    target = data;
    if (!target) return { error: "Member not found." };
    if (target.is_department_head) update.is_department_head = false;
    const { error } = await admin
      .from("profiles")
      .update(update)
      .eq("id", parsed.data.id);
    if (error) {
      return { error: `Could not update member: ${error.message}` };
    }
  }

  revalidatePath("/members");
  revalidatePath(`/members/${parsed.data.id}`);
  revalidatePath("/departments");
  revalidatePath("/dashboard");
  return {
    success:
      parsed.data.department_id === null
        ? "Member removed from their department."
        : "Member's department updated.",
  };
}

/** Admin-only: make a profile a Department Head of `departmentId` (moving
 * them into that department) or remove the head flag. */
export async function setDepartmentHead(
  id: string,
  departmentId: string,
  makeHead: boolean,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = setHeadSchema.safeParse({
    id,
    department_id: departmentId,
    makeHead,
  });
  if (!parsed.success) {
    return { error: "Invalid head assignment." };
  }

  const supabase = await createClient();
  const update = parsed.data.makeHead
    ? { is_department_head: true, department_id: parsed.data.department_id }
    : { is_department_head: false };
  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", parsed.data.id)
    .select("id");

  if (error) {
    return { error: `Could not update head: ${error.message}` };
  }
  if (!data || data.length === 0) {
    return { error: "Member not found." };
  }

  revalidatePath("/members");
  revalidatePath(`/members/${parsed.data.id}`);
  revalidatePath("/departments");
  return {
    success: parsed.data.makeHead
      ? "Member is now a Department Head."
      : "Head of department removed.",
  };
}
