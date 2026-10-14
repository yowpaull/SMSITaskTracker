"use client";

import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function currentMonth() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

export function ExportTaskLogsButton() {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(currentMonth);
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    if (!MONTH_PATTERN.test(month)) {
      setError("Pick a month.");
      return;
    }
    setError(null);
    const anchor = document.createElement("a");
    anchor.href = `/api/export/task-logs?month=${month}`;
    anchor.download = "";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <DownloadIcon data-icon="inline-start" />
            Export
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export to Excel</DialogTitle>
          <DialogDescription>
            Download all task logs created in the selected month as an .xlsx
            file.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="export-month">Month</Label>
          <Input
            id="export-month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            <DownloadIcon data-icon="inline-start" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
