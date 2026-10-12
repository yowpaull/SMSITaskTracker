"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createMemberSchema,
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
  await requireAdmin();

  const parsed = createMemberSchema.safeParse({
    email: formDataValue(formData, "email"),
    password: formDataValue(formData, "password"),
    full_name: formDataValue(formData, "full_name"),
    role: formDataValue(formData, "role"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });

  if (error) {
    return { error: `Could not create member: ${error.message}` };
  }

  if (parsed.data.role === "admin" && data.user) {
    const supabase = await createClient();
    const { error: roleError } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", data.user.id);
    if (roleError) {
      revalidatePath("/members");
      return {
        error: `Member created, but role could not be set: ${roleError.message}`,
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
  revalidatePath("/tasks");
  return {
    success:
      parsed.data.role === "admin"
        ? "Member is now an admin."
        : "Member is now a user.",
  };
}
