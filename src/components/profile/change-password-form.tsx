"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/components/shared/password-input";
import { changePassword } from "@/lib/actions/profile";
import { useResultToast } from "@/hooks/use-result-toast";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, null);
  useResultToast(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change password</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="profile-current-password">
                Current password
              </FieldLabel>
              <PasswordInput
                id="profile-current-password"
                name="current_password"
                required
                autoComplete="current-password"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-new-password">
                New password
              </FieldLabel>
              <PasswordInput
                id="profile-new-password"
                name="new_password"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-muted-foreground text-xs">
                At least 8 characters.
              </p>
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-confirm-password">
                Confirm new password
              </FieldLabel>
              <PasswordInput
                id="profile-confirm-password"
                name="confirm_password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={pending} className="w-fit">
            {pending && <Spinner data-icon="inline-start" />}
            Change password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
