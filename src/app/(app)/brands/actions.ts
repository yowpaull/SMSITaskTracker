"use server";

import { revalidatePath } from "next/cache";
import { toast } from "sonner";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { brandSchema } from "@/lib/validations/masters";

export type MasterActionState = { error: string } | null;

export async function createBrand(
  _prevState: MasterActionState,
  formData: FormData,
): Promise<MasterActionState> {
  await requireAdmin();

  const parsed = brandSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form values.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("brands")
    .insert({ name: parsed.data.name });

  if (error) {
    if (error.code === "23505") {
      return { error: "A brand with this name already exists." };
    }
    return { error: `Could not create brand: ${error.message}` };
  }

  toast.success("Brand created.");
  revalidatePath("/brands");
  revalidatePath("/tasks");
  return null;
}

export async function toggleBrandActive(id: string) {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("is_active, name")
    .eq("id", id)
    .single();

  if (error || !data) {
    toast.error("Brand not found.");
    return;
  }

  const { error: updateError } = await supabase
    .from("brands")
    .update({ is_active: !data.is_active })
    .eq("id", id);

  if (updateError) {
    toast.error(`Could not update brand: ${updateError.message}`);
    return;
  }

  toast.success(data.is_active ? "Brand deactivated." : "Brand activated.");
  revalidatePath("/brands");
  revalidatePath("/tasks");
}
