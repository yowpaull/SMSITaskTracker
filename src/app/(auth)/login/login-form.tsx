"use client";

import { useEffect, useActionState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/components/shared/password-input";
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-muted-foreground text-xs hover:text-foreground"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          required
          autoComplete="current-password"
        />
      </div>      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Spinner data-icon="inline-start" />}
        Sign in
      </Button>
    </form>
  );
}
