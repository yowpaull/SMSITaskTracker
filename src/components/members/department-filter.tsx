"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DepartmentOption = { id: string; name: string };

const ALL = "all";
const UNASSIGNED = "unassigned";

export function DepartmentFilter({
  departments,
  value,
  query,
}: {
  departments: DepartmentOption[];
  value: string;
  query?: string;
}) {
  const router = useRouter();

  function apply(next: string | null) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (next && next !== ALL) params.set("department", next);
    const qs = params.toString();
    router.replace(qs ? `/members?${qs}` : "/members", { scroll: false });
  }

  return (
    <Select
      items={[
        { label: "All departments", value: ALL },
        ...departments.map((department) => ({
          label: department.name,
          value: department.id,
        })),
        { label: "Unassigned", value: UNASSIGNED },
      ]}
      value={value || ALL}
      onValueChange={apply}
    >
      <SelectTrigger className="h-8 w-44 text-xs" aria-label="Filter by department">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          <SelectItem value={ALL}>All departments</SelectItem>
          {departments.map((department) => (
            <SelectItem key={department.id} value={department.id}>
              {department.name}
            </SelectItem>
          ))}
          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
