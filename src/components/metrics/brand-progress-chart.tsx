import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LegendDot,
  STATUS_SEGMENT_CLASSES,
} from "@/components/metrics/progress-chart-bits";
import type { BrandTaskStats } from "@/lib/data/task-logs";

const LEGEND = [
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

/** Vertical bar graph: one stacked column per brand. Bar height = task count
 * vs. the busiest brand; segments show the status mix. */
export function BrandProgressChart({ brands }: { brands: BrandTaskStats[] }) {
  const maxTotal = Math.max(0, ...brands.map((brand) => brand.total));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Tasks per brand</CardTitle>
        {maxTotal > 0 && (
          <span className="text-muted-foreground text-xs">
            bar height = task count
          </span>
        )}
      </CardHeader>
      <CardContent className="grid gap-4">
        {brands.length === 0 ? (
          <p className="text-muted-foreground text-sm">No brands yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <ul className="flex h-44 min-w-max items-stretch gap-2 sm:gap-3">
                {brands.map((brand) => {
                const description = `${brand.brandName}: ${brand.total} ${
                  brand.total === 1 ? "task" : "tasks"
                }, ${brand.progressPercent}% progress; ${brand.pending} pending, ${brand.inProgress} in progress, ${brand.completed} completed, ${brand.cancelled} cancelled`;
                const segments = [
                  { key: "pending", value: brand.pending },
                  { key: "in_progress", value: brand.inProgress },
                  { key: "completed", value: brand.completed },
                  { key: "cancelled", value: brand.cancelled },
                ].filter((segment) => segment.value > 0);

                return (
                  <li
                    key={brand.brandId}
                    className="flex min-w-14 flex-1 flex-col items-center gap-1"
                    title={description}
                  >
                    <span className="font-medium text-xs tabular-nums">
                      {brand.total}
                    </span>
                    <div
                      className="flex w-full max-w-12 flex-1 items-end"
                      role="img"
                      aria-label={description}
                    >
                      {brand.total > 0 && (
                        <div
                          className="flex w-full flex-col-reverse overflow-hidden rounded-md"
                          style={{
                            height: `${Math.max((brand.total / maxTotal) * 100, 6)}%`,
                          }}
                        >
                          {segments.map((segment) => (
                            <div
                              key={segment.key}
                              className={STATUS_SEGMENT_CLASSES[segment.key]}
                              style={{
                                flexGrow: segment.value,
                                flexBasis: 0,
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <span
                      className="w-full truncate text-center text-muted-foreground text-[10px]"
                      aria-hidden="true"
                    >
                      {brand.brandName}
                    </span>
                    <span className="text-muted-foreground text-[10px] tabular-nums">
                      {brand.progressPercent}%
                    </span>
                  </li>
                );
              })}
              </ul>
            </div>
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3">
              {LEGEND.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center gap-1.5 text-muted-foreground text-xs"
                >
                  <LegendDot className={STATUS_SEGMENT_CLASSES[item.key]} />
                  {item.label}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function BrandProgressChartSkeleton() {
  return (
    <Card aria-busy="true">
      <CardHeader className="flex-row items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-28" />
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="overflow-x-auto">
          <ul className="flex h-44 min-w-max items-stretch gap-2 sm:gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <li
                key={index}
                className="flex min-w-14 flex-1 flex-col items-center gap-1"
              >
                <Skeleton className="h-3 w-5" />
                <div className="flex w-full max-w-12 flex-1 items-end">
                  <Skeleton
                    className="w-full rounded-md"
                    style={{ height: `${[55, 90, 40, 70][index]}%` }}
                  />
                </div>
                <Skeleton className="h-3 w-full" />
              </li>
            ))}
          </ul>
        </div>
        <ul className="flex flex-wrap gap-4 border-t pt-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <li key={index}>
              <Skeleton className="h-3 w-20" />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
