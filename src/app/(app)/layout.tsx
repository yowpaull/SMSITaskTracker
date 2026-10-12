import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Skeleton } from "@/components/ui/skeleton";

function HeaderSkeleton() {
  return (
    <div className="h-12 border-b border-border" aria-busy="true">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center gap-4 px-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-44" />
        <Skeleton className="ml-auto size-6 rounded-full" />
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <AppHeader />
      </Suspense>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
