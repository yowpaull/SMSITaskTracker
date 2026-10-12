import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/app/auth/actions";
import { requireProfile } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

async function ProfileContent() {
  const profile = await requireProfile();

  return (
    <Card className="max-w-xl">
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
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ProfileSkeleton() {
  return (
    <Card className="max-w-xl" aria-busy="true">
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
  );
}

export default function ProfilePage() {
  return (
    <div className="grid gap-4">
      <PageHeader title="Profile" description="Your account details." />
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent />
      </Suspense>
    </div>
  );
}
