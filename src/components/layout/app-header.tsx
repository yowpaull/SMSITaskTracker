import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { AppNav } from "./app-nav";
import { UserMenu } from "./user-menu";

export async function AppHeader() {
  const profile = await requireProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center gap-3 px-4">
        <Link
          href="/dashboard"
          className="shrink-0 font-semibold text-sm tracking-tight"
        >
          Task Tracker
        </Link>
        <AppNav isAdmin={profile.role === "admin"} />
        <UserMenu
          fullName={profile.full_name}
          email={profile.email}
          role={profile.role}
        />
      </div>
    </header>
  );
}
