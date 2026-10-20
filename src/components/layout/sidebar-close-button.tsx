"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

/** Closes the mobile sidebar sheet (desktop sidebar has no close button). */
export function SidebarCloseButton() {
  const { setOpenMobile } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="shrink-0 text-sidebar-foreground/70 hover:bg-transparent! hover:text-sidebar-foreground! md:hidden"
      onClick={() => setOpenMobile(false)}
      aria-label="Close sidebar"
    >
      <XIcon />
    </Button>
  );
}
