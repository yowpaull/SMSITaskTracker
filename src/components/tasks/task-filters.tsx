"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS, TASK_STATUSES, type TaskStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

export type TaskFilterValues = {
  status?: TaskStatus;
  brandId?: string;
  categoryId?: string;
  assignedTo?: string;
  q?: string;
  from?: string;
  to?: string;
};

export type OptionItem = { label: string; value: string };

export function TaskFilters({
  filters,
  brandOptions,
  categoryOptions,
  memberOptions,
  showAssigneeFilter,
}: {
  filters: TaskFilterValues;
  brandOptions: OptionItem[];
  categoryOptions: OptionItem[];
  memberOptions: OptionItem[];
  showAssigneeFilter: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q ?? "");

  function apply(next: TaskFilterValues) {
    const params = new URLSearchParams();
    if (next.status) params.set("status", next.status);
    if (next.brandId) params.set("brand", next.brandId);
    if (next.categoryId) params.set("category", next.categoryId);
    if (next.assignedTo) params.set("assignee", next.assignedTo);
    if (next.q) params.set("q", next.q);
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    const qs = params.toString();
    router.replace(qs ? `/tasks?${qs}` : "/tasks", { scroll: false });
  }

  const statusItems = [
    { label: "All statuses", value: null },
    ...TASK_STATUSES.map((status) => ({
      label: STATUS_LABELS[status],
      value: status as string | null,
    })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          apply({ ...filters, q: q.trim() || undefined });
        }}
      >
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search tasks…"
          aria-label="Search tasks"
          className="h-7 w-44 text-xs"
        />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          aria-label="Search"
        >
          <SearchIcon data-icon="inline-start" />
          Search
        </Button>
      </form>

      <Select
        items={statusItems}
        value={filters.status ?? null}
        onValueChange={(value) =>
          apply({ ...filters, status: (value as TaskStatus | null) ?? undefined })
        }
      >
        <SelectTrigger size="sm" className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {statusItems.map((item) => (
              <SelectItem key={item.label} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        items={[{ label: "All brands", value: null }, ...brandOptions]}
        value={filters.brandId ?? null}
        onValueChange={(value) =>
          apply({ ...filters, brandId: value ?? undefined })
        }
      >
        <SelectTrigger size="sm" className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {[{ label: "All brands", value: null }, ...brandOptions].map(
              (item) => (
                <SelectItem key={item.value ?? "all"} value={item.value}>
                  {item.label}
                </SelectItem>
              ),
            )}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        items={[{ label: "All categories", value: null }, ...categoryOptions]}
        value={filters.categoryId ?? null}
        onValueChange={(value) =>
          apply({ ...filters, categoryId: value ?? undefined })
        }
      >
        <SelectTrigger size="sm" className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {[{ label: "All categories", value: null }, ...categoryOptions].map(
              (item) => (
                <SelectItem key={item.value ?? "all"} value={item.value}>
                  {item.label}
                </SelectItem>
              ),
            )}
          </SelectGroup>
        </SelectContent>
      </Select>

      {showAssigneeFilter && (
        <Select
          items={[{ label: "All assignees", value: null }, ...memberOptions]}
          value={filters.assignedTo ?? null}
          onValueChange={(value) =>
            apply({ ...filters, assignedTo: value ?? undefined })
          }
        >
          <SelectTrigger size="sm" className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectGroup>
              {[{ label: "All assignees", value: null }, ...memberOptions].map(
                (item) => (
                  <SelectItem key={item.value ?? "all"} value={item.value}>
                    {item.label}
                  </SelectItem>
                ),
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}

      <Input
        type="date"
        value={filters.from ?? ""}
        onChange={(event) =>
          apply({ ...filters, from: event.target.value || undefined })
        }
        aria-label="Created from"
        className="h-7 w-32 text-xs"
      />
      <Input
        type="date"
        value={filters.to ?? ""}
        onChange={(event) =>
          apply({ ...filters, to: event.target.value || undefined })
        }
        aria-label="Created to"
        className="h-7 w-32 text-xs"
      />

      {(filters.status ||
        filters.brandId ||
        filters.categoryId ||
        filters.assignedTo ||
        filters.q ||
        filters.from ||
        filters.to) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("text-muted-foreground")}
          onClick={() => {
            setQ("");
            apply({});
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
