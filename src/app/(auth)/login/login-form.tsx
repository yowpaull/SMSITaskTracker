"use client";

import { useEffect, useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { login } from "@/lib/actions/auth";
import { useResultToast } from "@/hooks/use-result-toast";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const wasDeactivated = searchParams.get("deactivated") === "1";
  useResultToast(state);

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="grid gap-4">
      {wasDeactivated && (
        <Alert variant="destructive">
          <AlertDescription>
            Your account has been deactivated. Contact an administrator.
          </AlertDescription>
        </Alert>
      )}
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Spinner data-icon="inline-start" />}
        Sign in
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Accounts are created by an administrator. There is no self sign-up.
      </p>
    </form>
  );
}
