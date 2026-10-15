import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LegendDot,
  ProgressBar,
  STATUS_SEGMENT_CLASSES,
  STATUS_TOKEN_COLORS,
} from "@/components/metrics/progress-chart-bits";
import type { GroupTaskStats } from "@/lib/data/task-logs";

const LEGEND = [
  { key: "pending", label: "Pending" },
  { key: "inProgress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

const SEGMENT_KEYS: Record<(typeof LEGEND)[number]["key"], string> = {
  pending: "pending",
  inProgress: "in_progress",
  completed: "completed",
  cancelled: "cancelled",
};

/** Donut pie chart of the status share + overall progress (admin dashboard). */
export function StatusBreakdownChart({ stats }: { stats: GroupTaskStats }) {
  const legend = LEGEND.map((item) => {
    const value = stats[item.key];
    return {
      ...item,
      value,
      percent: stats.total === 0 ? 0 : Math.round((value / stats.total) * 100),
    };
  });

  // Build the conic-gradient stops, skipping zero-count statuses.
  let angle = 0;
  const stops: string[] = [];
  for (const item of legend) {
    if (item.value === 0) continue;
    const sweep = (item.value / stats.total) * 360;
    stops.push(
      `${STATUS_TOKEN_COLORS[SEGMENT_KEYS[item.key]]} ${angle}deg ${angle + sweep}deg`,
    );
    angle += sweep;
  }
  const pieBackground =
    stops.length > 0 ? `conic-gradient(${stops.join(", ")})` : undefined;
  const pieDescription = legend
    .map((item) => `${item.value} ${item.label.toLowerCase()}`)
    .join(", ");

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Status breakdown</CardTitle>
        {stats.total > 0 && (
          <span className="text-muted-foreground text-xs tabular-nums">
            {stats.total} {stats.total === 1 ? "task" : "tasks"} total
          </span>
        )}
      </CardHeader>
      <CardContent className="grid gap-4">
        {stats.total === 0 ? (
          <p className="text-muted-foreground text-sm">No task logs yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-6">
              <div
                className="relative size-36 shrink-0 rounded-full border border-border"
                style={{ background: pieBackground }}
                role="img"
                aria-label={`Status pie chart of ${stats.total} tasks: ${pieDescription}`}
              >
                <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-card">
                  <span className="font-semibold text-2xl tabular-nums">
                    {stats.total}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {stats.total === 1 ? "task" : "tasks"}
                  </span>
                </div>
              </div>
              <ul className="grid min-w-40 flex-1 gap-1.5">
                {legend.map((item) => (
                  <li key={item.key} className="flex items-center gap-2 text-xs">
                    <LegendDot
                      className={STATUS_SEGMENT_CLASSES[SEGMENT_KEYS[item.key]]}
                    />
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="ml-auto font-medium tabular-nums">
                      {item.value} · {item.percent}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-2 border-t pt-4">
              <div className="flex items-baseline justify-between">
                <span className="font-medium text-sm">Overall progress</span>
                <span className="font-semibold text-xl tabular-nums">
                  {stats.progressPercent}%
                </span>
              </div>
              <ProgressBar
                percent={stats.progressPercent}
                label="Overall progress"
              />
              <p className="text-muted-foreground text-xs">
                {stats.completed} of {stats.progressTotal} completed · cancelled
                excluded
                {stats.delayed > 0 && (
                  <>
                    {" · "}
                    <span className="font-medium text-warning">
                      {stats.delayed} delayed
                    </span>{" "}
                    (past deadline, still open)
                  </>
                )}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function StatusBreakdownChartSkeleton() {
  return (
    <Card aria-busy="true">
      <CardHeader className="flex-row items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-16" />
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <Skeleton className="size-36 rounded-full" />
          <ul className="grid min-w-40 flex-1 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <li key={index}>
                <Skeleton className="h-3 w-full" />
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-2 border-t pt-4">
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="h-3 w-48" />
        </div>
      </CardContent>
    </Card>
  );
}
