"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions/types";

export function useResultToast(state: ActionResult) {
  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);
}
