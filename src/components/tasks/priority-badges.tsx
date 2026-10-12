import { Badge } from "@/components/ui/badge";

export function PriorityBadges({
  urgent,
  important,
}: {
  urgent: boolean;
  important: boolean;
}) {
  if (!urgent && !important) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {urgent && (
        <Badge
          variant="secondary"
          className="border-transparent bg-destructive/10 text-destructive"
        >
          Urgent
        </Badge>
      )}
      {important && (
        <Badge
          variant="secondary"
          className="border-transparent bg-warning/10 text-warning"
        >
          Important
        </Badge>
      )}
    </span>
  );
}
