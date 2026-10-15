import { cn } from "@/lib/utils";

/** Segment colors match the StatusBadge palette (secondary/primary/success/muted). */
export const STATUS_SEGMENT_CLASSES: Record<string, string> = {
  pending: "bg-secondary",
  in_progress: "bg-primary",
  completed: "bg-success",
  cancelled: "bg-muted-foreground/30",
};

/** Raw token colors for canvas-free charts (conic-gradient etc.). */
export const STATUS_TOKEN_COLORS: Record<string, string> = {
  pending: "var(--secondary)",
  in_progress: "var(--primary)",
  completed: "var(--success)",
  cancelled: "color-mix(in oklab, var(--muted-foreground) 30%, transparent)",
};

export function ProgressBar({
  percent,
  label,
}: {
  percent: number;
  label: string;
}) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded-full bg-success transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function LegendDot({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-2.5 shrink-0 rounded-full", className)}
    />
  );
}
