"use client";

import { useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/components/shared/password-input";
import { completePasswordReset } from "@/lib/actions/auth";
import { useResultToast } from "@/hooks/use-result-toast";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    completePasswordReset,
    null,
  );
  const router = useRouter();
  useResultToast(state);

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="grid gap-4">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-2">
        {/* Route-prefixed ids: hidden pages stay mounted after client
            navigation (Next Cache Components / Activity), so ids must be
            unique across routes. Field names stay password/confirm_password
            for the action. */}
        <Label htmlFor="new-password">New password</Label>
        <PasswordInput
          id="new-password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <PasswordInput
          id="confirm-password"
          name="confirm_password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Spinner data-icon="inline-start" />}
        Update password
      </Button>
    </form>
  );
}
