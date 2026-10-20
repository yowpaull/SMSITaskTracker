import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";

export const instant = false;

export default async function RootPage() {
  const profile = await getProfile();
  redirect(profile?.role === "admin" || profile?.is_department_head ? "/dashboard" : "/tasks");
}
