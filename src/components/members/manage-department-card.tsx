"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  setDepartmentHead,
  setMemberDepartment,
} from "@/lib/actions/departments";

const NO_DEPARTMENT = "none";

type DepartmentOption = { id: string; name: string };

export function ManageDepartmentCard({
  memberId,
  departmentId,
  isHead,
  departments,
}: {
  memberId: string;
  departmentId: string | null;
  isHead: boolean;
  departments: DepartmentOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>(
    departmentId ?? NO_DEPARTMENT,
  );

  const items = [
    { label: "No department", value: NO_DEPARTMENT },
    ...departments.map((department) => ({
      label: department.name,
      value: department.id,
    })),
  ];

  function run(
    action: () => Promise<{ error?: string; success?: string } | null>,
  ) {
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        toast.success(result.success);
      }
    });
  }

  function assign() {
    const next = selected === NO_DEPARTMENT ? null : selected;
    if (next === departmentId) {
      toast.message("This member is already in that department.");
      return;
    }
    run(() => setMemberDepartment(memberId, next));
  }

  function makeHead() {
    if (!departmentId) {
      toast.error("Assign the member to a department first.");
      return;
    }
    run(() => setDepartmentHead(memberId, departmentId, true));
  }

  function removeHead() {
    if (!departmentId) return;
    run(() => setDepartmentHead(memberId, departmentId, false));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Department</CardTitle>
        <CardDescription>
          Assign the member to a department or grant head rights.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Assignment
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              items={items}
              value={selected}
              onValueChange={(value) => setSelected(value ?? NO_DEPARTMENT)}
            >
              <SelectTrigger className="w-56" aria-label="Department">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={
                pending || selected === (departmentId ?? NO_DEPARTMENT)
              }
              onClick={assign}
            >
              Save
            </Button>
          </div>
        </div>
        <div className="grid gap-2">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Head of department
          </p>
          {isHead ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-muted-foreground text-sm">
                This member is a department head.
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={removeHead}
              >
                Remove head
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pending || !departmentId}
                onClick={makeHead}
              >
                Make head
              </Button>
              {!departmentId && (
                <p className="text-muted-foreground text-sm">
                  Assign a department first.
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
