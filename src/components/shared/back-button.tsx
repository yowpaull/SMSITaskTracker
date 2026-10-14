import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({
  href,
  label = "Back",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Button
      render={<Link href={href} />}
      nativeButton={false}
      variant="ghost"
      size="sm"
      className="-ml-2 w-fit text-muted-foreground"
    >
      <ArrowLeftIcon data-icon="inline-start" />
      {label}
    </Button>
  );
}
