"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { signOut } from "@/lib/actions/auth";

export function useSignOut() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function signOutNow() {
    startTransition(async () => {
      const result = await signOut();
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        toast.success(result.success);
      }
      router.push("/login");
    });
  }

  return { signOutNow, pending };
}

export function SignOutButton({
  variant = "outline",
  iconOnly = false,
  className,
}: {
  variant?: "default" | "outline" | "ghost";
  iconOnly?: boolean;
  className?: string;
}) {
  const { signOutNow, pending } = useSignOut();

  if (iconOnly) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={pending}
        onClick={signOutNow}
        aria-label="Sign out"
        className={className}
      >
        {pending ? (
          <Spinner className="size-4" />
        ) : (
          <LogOutIcon className="size-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      disabled={pending}
      onClick={signOutNow}
      className={className}
    >
      {pending && <Spinner data-icon="inline-start" />}
      Sign out
    </Button>
  );
}
