import Link from "next/link";
import { Suspense } from "react";
import { SquareCheckBigIcon } from "lucide-react";
import { AppSidebarNav } from "@/components/layout/app-sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { requireProfile } from "@/lib/auth";

async function SidebarNavContent() {
  const profile = await requireProfile();
  return <AppSidebarNav isAdmin={profile.role === "admin"} />;
}

async function SidebarFooterContent() {
  const profile = await requireProfile();
  return (
    <div className="flex items-center gap-1">
      <UserMenu
        fullName={profile.full_name}
        email={profile.email}
        role={profile.role}
        className="min-w-0 flex-1"
      />
      <SignOutButton
        iconOnly
        className="shrink-0 text-white/80 hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:hidden"
      />
    </div>
  );
}

function SidebarNavSkeleton() {
  return (
    <SidebarMenu aria-busy="true">
      {Array.from({ length: 5 }).map((_, index) => (
        <SidebarMenuItem key={index}>
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <Skeleton className="size-3.5" />
            <Skeleton className="h-4 w-24" />
          </div>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function SidebarFooterSkeleton() {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5" aria-busy="true">
      <Skeleton className="size-6 rounded-full" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

export function AppSidebar() {
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/dashboard" />}
              tooltip="Task Tracker"
            >
              <SquareCheckBigIcon />
              <span className="font-semibold tracking-tight">
                Task Tracker
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <Suspense fallback={<SidebarNavSkeleton />}>
          <SidebarNavContent />
        </Suspense>
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator className="mx-0" />
        <Suspense fallback={<SidebarFooterSkeleton />}>
          <SidebarFooterContent />
        </Suspense>
      </SidebarFooter>
    </Sidebar>
  );
}
