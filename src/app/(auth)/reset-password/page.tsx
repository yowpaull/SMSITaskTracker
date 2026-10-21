import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthUser, getProfile } from "@/lib/auth";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Reset password · Task Tracker",
};

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function ResetPasswordContent({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const linkFailed = first(params.error) === "1";

  const user = await getAuthUser();
  if (!user || linkFailed) {
    return (
      <div className="grid gap-4">
        <Alert variant="destructive">
          <AlertDescription>
            This reset link is invalid or has expired.
          </AlertDescription>
        </Alert>
        <p className="text-muted-foreground text-sm">
          Reset links can only be used once and expire after a short time.
        </p>
        <Button
          render={<Link href="/forgot-password" />}
          nativeButton={false}
          variant="outline"
          className="w-full"
        >
          Request a new link
        </Button>
      </div>
    );
  }

  // A recovery session for a deactivated account must not reach the form.
  const profile = await getProfile();
  if (profile && !profile.is_active) {
    redirect("/login?deactivated=1");
  }

  return <ResetPasswordForm />;
}

function ResetPasswordSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">Choose a new password</CardTitle>
          <CardDescription>
            Set a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ResetPasswordSkeleton />}>
            <ResetPasswordContent searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
