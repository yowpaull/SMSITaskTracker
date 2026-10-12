"use client";

import { useTransition } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions/types";

export function ActionForm({
  action,
  children,
  className,
}: {
  action: () => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={() =>
        startTransition(async () => {
          const result = await action();
          if (result?.error) {
            toast.error(result.error);
          } else if (result?.success) {
            toast.success(result.success);
          }
        })
      }
      className={className}
      aria-busy={pending || undefined}
    >
      {children}
    </form>
  );
}
