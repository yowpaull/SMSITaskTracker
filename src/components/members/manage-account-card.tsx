"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { setMemberActive, updateMemberRole } from "@/lib/actions/members";

export function ManageAccountCard({
  memberId,
  currentRole,
  isActive,
  isSelf,
  viewerIsAdmin,
}: {
  memberId: string;
  currentRole: "admin" | "user";
  isActive: boolean;
  isSelf: boolean;
  viewerIsAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<{ error?: string; success?: string } | null>,
  ) {
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        toast.success(result.success);
      }
    });
  }

  if (isSelf) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>
            This is your own account. Ask another admin to change it.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Account</CardTitle>
        <CardDescription>
          {viewerIsAdmin
            ? "Change the member's role or deactivate their sign-in."
            : "Deactivate or reactivate this member's sign-in."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {viewerIsAdmin && (
          <div className="grid gap-2">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Role
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pending || currentRole === "admin"}
                onClick={() => run(() => updateMemberRole(memberId, "admin"))}
              >
                Make admin
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending || currentRole === "user"}
                onClick={() => run(() => updateMemberRole(memberId, "user"))}
              >
                Make member
              </Button>
            </div>
          </div>
        )}
        <div className="grid gap-2">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Status
          </p>
          <div>
            {isActive ? (
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={pending}
                onClick={() => run(() => setMemberActive(memberId, false))}
              >
                Deactivate account
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => run(() => setMemberActive(memberId, true))}
              >
                Activate account
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
