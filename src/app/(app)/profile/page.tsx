import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { EditNameForm } from "@/components/profile/edit-name-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireProfile } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

async function ProfileContent() {
  const profile = await requireProfile();

  return (
    <div className="grid max-w-xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Full name</p>
            <p>{profile.full_name || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Email</p>
            <p>{profile.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Role</p>
            <Badge
              variant="secondary"
              className={
                profile.role === "admin"
                  ? "border-transparent bg-primary/10 text-primary"
                  : "border-transparent bg-secondary text-secondary-foreground"
              }
            >
              {profile.role === "admin" ? "Admin" : "Member"}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Member since</p>
            <p>{formatDateTime(profile.created_at)}</p>
          </div>
          <div>
            <SignOutButton />
          </div>
        </CardContent>
      </Card>

      <EditNameForm initialFullName={profile.full_name} />
      <ChangePasswordForm />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="grid max-w-xl gap-4" aria-busy="true">
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent className="grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="grid gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="grid gap-3">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-24" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="grid gap-3">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-32" />
        </CardContent>
      </Card>
    </div>
  );
}

export const instant = false;

export default function ProfilePage() {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Profile"
        description="Your account details, name, and password."
      />
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent />
      </Suspense>
    </div>
  );
}
