import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="font-semibold text-2xl">Page not found</h1>
      <p className="text-muted-foreground text-sm">
        The page you are looking for does not exist or you do not have
        access to it.
      </p>
      <Button render={<Link href="/dashboard" />}>Back to dashboard</Button>
    </main>
  );
}
