import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export const instant = false;

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-background px-4">
          <SidebarTrigger />
        </header>
        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
