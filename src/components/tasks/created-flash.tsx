"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Toasts "Task log created." once after a successful create (the server
 * action redirects here with ?created=1) and strips the query param so a
 * refresh or later visit doesn't replay the toast.
 */
export function CreatedFlash() {
  const router = useRouter();

  useEffect(() => {
    toast.success("Task log created.");
    router.replace("/tasks", { scroll: false });
  }, [router]);

  return null;
}
