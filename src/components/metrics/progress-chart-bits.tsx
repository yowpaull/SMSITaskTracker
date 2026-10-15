import { cn } from "@/lib/utils";

/** Segment colors match the app's semantic token family. */
export const STATUS_SEGMENT_CLASSES: Record<string, string> = {
  pending: "bg-pending",
  in_progress: "bg-primary",
  completed: "bg-success",
  cancelled: "bg-cancelled",
};

/** Raw token colors for canvas-free charts (conic-gradient etc.). */
export const STATUS_TOKEN_COLORS: Record<string, string> = {
  pending: "var(--pending)",
  in_progress: "var(--primary)",
  completed: "var(--success)",
  cancelled: "var(--cancelled)",
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
