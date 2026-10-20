import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MyTaskStats } from "@/lib/data/task-logs";

function StatusCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="font-medium text-muted-foreground text-xs">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={`font-semibold text-2xl tabular-nums ${className ?? ""}`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

/** Status counts and overall progress for the signed-in user's own tasks. */
export function MyProgressCards({ stats }: { stats: MyTaskStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatusCard label="Total" value={stats.total} />
      <StatusCard label="Pending" value={stats.pending} />
      <StatusCard
        label="In progress"
        value={stats.inProgress}
        className="text-destructive"
      />
      <StatusCard
        label="Completed"
        value={stats.completed}
        className="text-success"
      />
      <StatusCard
        label="Cancelled"
        value={stats.cancelled}
        className="text-destructive"
      />
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="font-medium text-muted-foreground text-xs">
            Overall progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-semibold text-2xl tabular-nums">
            {stats.progressPercent}%
          </p>
          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={stats.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall progress"
          >
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>
          <p className="mt-1 text-muted-foreground text-xs">
            {stats.completed} of {stats.progressTotal} completed · cancelled
            excluded
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
