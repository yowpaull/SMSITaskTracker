"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BuildingIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  ListPlusIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboardIcon,
    staffOnly: true,
  },
  { href: "/tasks", label: "Tasks", icon: ListChecksIcon },
  { href: "/create-task", label: "Create Task", icon: ListPlusIcon },
  {
    href: "/brands",
    label: "Brands",
    icon: BuildingIcon,
    adminOnly: true,
  },
  {
    href: "/departments",
    label: "Departments",
    icon: UsersRoundIcon,
    adminOnly: true,
  },
  {
    href: "/members",
    label: "Members",
    icon: UsersIcon,
    staffOnly: true,
  },
] as const;

export function AppSidebarNav({
  isAdmin,
  isHead,
}: {
  isAdmin: boolean;
  isHead: boolean;
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {NAV_ITEMS.filter((item) => {
        if ("adminOnly" in item && item.adminOnly) return isAdmin;
        if ("staffOnly" in item && item.staffOnly) return isAdmin || isHead;
        return true;
      }).map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              render={<Link href={item.href} />}
              isActive={active}
              tooltip={item.label}
              onClick={() => setOpenMobile(false)}
            >
              <item.icon />
              {item.label}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
