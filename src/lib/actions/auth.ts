"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/types";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type LoginState = ActionResult;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Invalid email or password." };
  }

  // Deactivated accounts must not stay signed in.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile && profile.is_active === false) {
    await supabase.auth.signOut();
    return { error: "Your account has been deactivated. Contact an administrator." };
  }

  revalidatePath("/", "layout");
  return { success: "Welcome back!" };
}

export async function signOut(): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { success: "Signed out." };
}

const GENERIC_RESET_SENT =
  "If an account for that email exists, a password reset link has been sent.";

export type RequestPasswordResetState = ActionResult;

/**
 * Always answers with the same generic success so responses never reveal
 * whether an account exists (GoTrue itself returns no error for unknown
 * emails; rate-limit errors are swallowed here for the same reason).
 */
export async function requestPasswordReset(
  _prevState: RequestPasswordResetState,
  formData: FormData,
): Promise<RequestPasswordResetState> {
  const parsed = z
    .object({ email: z.email() })
    .safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { success: GENERIC_RESET_SENT };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
    );
    if (error) {
      console.warn("resetPasswordForEmail failed:", error.message);
    }
  } catch (err) {
    console.warn(
      "resetPasswordForEmail threw:",
      err instanceof Error ? err.message : err,
    );
  }

  return { success: GENERIC_RESET_SENT };
}

const completePasswordResetSchema = z
  .object({
    password: z.string().min(8, "New password must be at least 8 characters."),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "New passwords do not match.",
    path: ["confirm_password"],
  });

export type CompletePasswordResetState = ActionResult;

/**
 * Sets the password for the session created by /auth/confirm (recovery
 * token exchange). Requires an active session — a dead link means no
 * session, which is reported as an expired-link error.
 */
export async function completePasswordReset(
  _prevState: CompletePasswordResetState,
  formData: FormData,
): Promise<CompletePasswordResetState> {
  const parsed = completePasswordResetSchema.safeParse({
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      error: "This reset link is invalid or has expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { error: `Could not update password: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { success: "Password updated. You're signed in." };
}
