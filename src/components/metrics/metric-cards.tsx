import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardMetrics } from "@/lib/data/task-logs";

type Metric = {
  label: string;
  value: number;
  hint?: string;
  className?: string;
};

function MetricCard({ label, value, hint }: Metric) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="font-medium text-muted-foreground text-xs">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-2xl tabular-nums">{value}</p>
        {hint && <p className="mt-0.5 text-muted-foreground text-xs">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function MetricCards({ metrics }: { metrics: DashboardMetrics }) {
  const items: Metric[] = [
    { label: "Total", value: metrics.total },
    { label: "Pending", value: metrics.pending },
    { label: "In progress", value: metrics.inProgress },
    {
      label: "Delayed",
      value: metrics.delayed,
      hint: "Past deadline, still open",
    },
    { label: "Completed", value: metrics.completed },
    { label: "Cancelled", value: metrics.cancelled },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <MetricCard key={item.label} {...item} />
      ))}
    </div>
  );
}

export function MetricCardsSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      aria-busy="true"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="pb-1">
            <Skeleton className="h-3 w-16" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-10" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
