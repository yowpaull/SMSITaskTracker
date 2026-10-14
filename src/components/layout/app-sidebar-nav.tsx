"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BuildingIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  ListPlusIcon,
  UsersIcon,
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
    adminOnly: true,
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
    href: "/members",
    label: "Members",
    icon: UsersIcon,
    adminOnly: true,
  },
] as const;

export function AppSidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {NAV_ITEMS.filter(
        (item) => !("adminOnly" in item && item.adminOnly) || isAdmin,
      ).map((item) => {
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
