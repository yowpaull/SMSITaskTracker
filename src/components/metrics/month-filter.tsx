"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Native month picker scoped to ?month=YYYY-MM; empty = all time. */
export function MonthFilter({ month }: { month?: string }) {
  const router = useRouter();

  function apply(value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      params.set("month", value);
    } else {
      params.delete("month");
    }
    const qs = params.toString();
    router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-xs">Month</span>
      <Input
        type="month"
        value={month ?? ""}
        onChange={(event) => apply(event.target.value)}
        aria-label="Filter dashboard by month"
        className="h-8 w-36 text-xs"
      />
      {month && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => apply("")}
        >
          All time
        </Button>
      )}
    </div>
  );
}
