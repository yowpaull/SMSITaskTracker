"use server";

import { revalidatePath } from "next/cache";
import { toast } from "sonner";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createMemberSchema,
  updateMemberRoleSchema,
} from "@/lib/validations/members";

export type MemberActionState = { error: string } | null;

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
      toast.error(
        `Member created, but role could not be set: ${roleError.message}`,
      );
      revalidatePath("/members");
      return null;
    }
  }

  toast.success("Member created. They can sign in now.");
  revalidatePath("/members");
  revalidatePath("/tasks");
  return null;
}

export async function updateMemberRole(
  id: string,
  role: "admin" | "user",
): Promise<void> {
  const adminProfile = await requireAdmin();

  const parsed = updateMemberRoleSchema.safeParse({ id, role });
  if (!parsed.success) {
    toast.error("Invalid role change.");
    return;
  }

  if (parsed.data.id === adminProfile.id) {
    toast.error("You cannot change your own role.");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.id);

  if (error) {
    toast.error(`Could not update role: ${error.message}`);
    return;
  }

  toast.success(
    parsed.data.role === "admin"
      ? "Member is now an admin."
      : "Member is now a user.",
  );
  revalidatePath("/members");
  revalidatePath("/tasks");
}
