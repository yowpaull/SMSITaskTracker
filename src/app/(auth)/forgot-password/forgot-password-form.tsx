"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { requestPasswordReset } from "@/lib/actions/auth";
import { useResultToast } from "@/hooks/use-result-toast";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    null,
  );
  useResultToast(state);

  if (state?.success) {
    return (
      <div className="grid gap-4">
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
        <p className="text-muted-foreground text-sm">
          The link can only be used once and expires after a short time. Check
          your spam folder if you don&apos;t see it.
        </p>
        <Button
          render={<Link href="/login" />}
          nativeButton={false}
          variant="outline"
          className="w-full"
        >
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-2">
        {/* Route-prefixed id: hidden pages stay mounted after client
            navigation (Next Cache Components / Activity), so ids must be
            unique across routes. The input name stays "email" for the action. */}
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Spinner data-icon="inline-start" />}
        Send reset link
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="hover:text-foreground">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
