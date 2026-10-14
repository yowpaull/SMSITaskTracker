"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/types";

export type ProfileActionState = ActionResult;

const updateFullNameSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required.").max(120),
});

export async function updateFullName(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  // Enforce a signed-in session; updateUser below acts on that user.
  await requireUser();

  const parsed = updateFullNameSchema.safeParse({
    full_name: formData.get("full_name"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  const supabase = await createClient();
  // Updates auth metadata; a DB trigger (20261014023525) syncs
  // public.profiles.full_name. Users have no direct UPDATE on profiles.
  const { error } = await supabase.auth.updateUser({
    data: { full_name: parsed.data.full_name },
  });
  if (error) {
    return { error: `Could not update name: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { success: "Name updated." };
}

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    new_password: z
      .string()
      .min(8, "New password must be at least 8 characters."),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "New passwords do not match.",
    path: ["confirm_password"],
  });

export async function changePassword(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    current_password: formData.get("current_password"),
    new_password: formData.get("new_password"),
    confirm_password: formData.get("confirm_password"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  const supabase = await createClient();

  // GoTrue does not ask for the old password on updateUser, so verify it
  // first by re-authenticating with the current credentials.
  if (!user.email) {
    return { error: "Your account has no email address on file." };
  }
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });
  if (verifyError) {
    return { error: "Your current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });
  if (error) {
    return { error: `Could not change password: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { success: "Password changed." };
}
