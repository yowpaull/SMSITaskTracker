import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type AuthUser = { id: string; email?: string };

export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error) return null;
  const claims = data?.claims;
  if (!claims) return null;
  return { id: claims.sub, email: claims.email };
});

export async function requireUser(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  // Deactivated accounts are kept out of every authed page. The ?deactivated
  // flag stops the proxy from bouncing them back into the app (see proxy.ts).
  const profile = await getProfile();
  if (profile && !profile.is_active) {
    redirect("/login?deactivated=1");
  }
  return user;
}

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) return null;
  return data as Profile;
});

export async function requireProfile(): Promise<Profile> {
  const user = await requireUser();
  const profile = await getProfile();
  if (!profile) {
    throw new Error(
      `No profile found for user ${user.id}. The auth trigger may not be installed — run the Supabase migrations.`,
    );
  }
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/tasks");
  return profile;
}

/** Admin or Department Head; plain members are redirected to /tasks. */
export async function requireStaffProfile(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin" && !profile.is_department_head) {
    redirect("/tasks");
  }
  return profile;
}

/** The signed-in Department Head's profile; non-heads go to /tasks. */
export async function requireDepartmentHead(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin" && (!profile.is_department_head || !profile.department_id)) {
    redirect("/tasks");
  }
  return profile;
}
