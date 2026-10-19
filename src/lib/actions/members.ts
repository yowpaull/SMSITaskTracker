"use server";

import { revalidatePath } from "next/cache";
import {
  requireAdmin,
  requireProfile,
  requireStaffProfile,
} from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createMemberSchema,
  memberIdSchema,
  updateMemberRoleSchema,
} from "@/lib/validations/members";
import type { ActionResult } from "@/lib/actions/types";

export type MemberActionState = ActionResult;

function formDataValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value !== "" ? value : undefined;
}

export async function createMember(
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const viewer = await requireStaffProfile();
  const isAdmin = viewer.role === "admin";

  const parsed = createMemberSchema.safeParse({
    email: formDataValue(formData, "email"),
    password: formDataValue(formData, "password"),
    full_name: formDataValue(formData, "full_name"),
    role: formDataValue(formData, "role"),
    department_id: formDataValue(formData, "department_id") ?? null,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  // Department Heads always create plain members inside their own
  // department; role and department come from the viewer, not the form.
  const role = isAdmin ? parsed.data.role : "user";
  const departmentId = isAdmin
    ? (parsed.data.department_id ?? null)
    : viewer.department_id;

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
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });

  if (error) {
    return { error: `Could not create member: ${error.message}` };
  }

  const profileUpdate: { role?: "admin"; department_id: string | null } = {
    department_id: departmentId,
  };
  if (role === "admin") profileUpdate.role = "admin";

  if (data.user) {
    // Service client: the profiles UPDATE RLS policy is admin-only, so a
    // head assigning their own department needs it (same as setMemberActive).
    const { error: profileError } = await admin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", data.user.id);
    if (profileError) {
      revalidatePath("/members");
      return {
        error: `Member created, but profile could not be set: ${profileError.message}`,
      };
    }
  }

  revalidatePath("/members");
  revalidatePath("/tasks");
  return { success: "Member created. They can sign in now." };
}

export async function updateMemberRole(
  id: string,
  role: "admin" | "user",
): Promise<ActionResult> {
  const adminProfile = await requireAdmin();

  const parsed = updateMemberRoleSchema.safeParse({ id, role });
  if (!parsed.success) {
    return { error: "Invalid role change." };
  }

  if (parsed.data.id === adminProfile.id) {
    return { error: "You cannot change your own role." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.id);

  if (error) {
    return { error: `Could not update role: ${error.message}` };
  }

  revalidatePath("/members");
  revalidatePath(`/members/${parsed.data.id}`);
  revalidatePath("/tasks");
  return {
    success:
      parsed.data.role === "admin"
        ? "Member is now an admin."
        : "Member is now a user.",
  };
}

export async function setMemberActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const profile = await requireProfile();

  const parsed = memberIdSchema.safeParse({ id });
  if (!parsed.success) {
    return { error: "Invalid member." };
  }

  if (parsed.data.id === profile.id) {
    return { error: "You cannot deactivate your own account." };
  }

  if (profile.role === "admin") {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", parsed.data.id)
      .select("id");

    if (error) {
      return { error: `Could not update account: ${error.message}` };
    }
    if (!data || data.length === 0) {
      return { error: "Member not found." };
    }

    revalidatePath("/members");
    revalidatePath(`/members/${parsed.data.id}`);
    revalidatePath("/tasks");
    return {
      success: isActive
        ? "Account activated. They can sign in again."
        : "Account deactivated. They can no longer sign in.",
    };
  }

  // Department Heads manage accounts of their own members via the service
  // client (profiles UPDATE RLS is admin-only).
  if (!profile.is_department_head || !profile.department_id) {
    return { error: "Only admins or department heads can change accounts." };
  }

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

  const { data: target } = await admin
    .from("profiles")
    .select("id, department_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!target) {
    return { error: "Member not found." };
  }
  if (target.department_id !== profile.department_id) {
    return { error: "You can only manage members of your department." };
  }

  const { error } = await admin
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", parsed.data.id);
  if (error) {
    return { error: `Could not update account: ${error.message}` };
  }

  revalidatePath("/members");
  revalidatePath(`/members/${parsed.data.id}`);
  revalidatePath("/tasks");
  return {
    success: isActive
      ? "Account activated. They can sign in again."
      : "Account deactivated. They can no longer sign in.",
  };
}
