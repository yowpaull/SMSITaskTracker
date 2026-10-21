import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { listTaskLogsInRange } from "@/lib/data/task-logs";
import { STATUS_LABELS } from "@/lib/status";
import { formatDate, formatDateTime } from "@/lib/format";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!MONTH_PATTERN.test(month)) {
    return NextResponse.json(
      { error: "Pick a month as YYYY-MM." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Month bounds in UTC (timestamps are stored in UTC).
  const [year, monthNumber] = month.split("-").map(Number);
  const fromIso = new Date(Date.UTC(year, monthNumber - 1, 1)).toISOString();
  const toIso = new Date(Date.UTC(year, monthNumber, 1)).toISOString();

  let logs;
  try {
    logs = await listTaskLogsInRange(fromIso, toIso);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed." },
      { status: 500 },
    );
  }

  const header = [
    "Task",
    "Category",
    "Brand",
    "Assignee",
    "Status",
    "Urgent",
    "Important",
    "Deadline",
    "Completed at",
    "Created at",
    "Remarks",
  ];

  const rows = logs.map((log) => [
    log.task?.name ?? "Unknown task",
    log.task?.subcategory
      ? log.task.subcategory.category
        ? `${log.task.subcategory.category.name} / ${log.task.subcategory.name}`
        : log.task.subcategory.name
      : "",
    log.brand?.name ?? "",
    log.assignee?.full_name || log.assignee?.email || "",
    STATUS_LABELS[log.status] ?? log.status,
    log.urgent ? "Yes" : "No",
    log.important ? "Yes" : "No",
    formatDate(log.deadline),
    formatDateTime(log.completed_at),
    formatDateTime(log.created_at),
    log.remarks ?? "",
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  worksheet["!cols"] = [
    { wch: 32 },
    { wch: 20 },
    { wch: 20 },
    { wch: 24 },
    { wch: 14 },
    { wch: 8 },
    { wch: 10 },
    { wch: 16 },
    { wch: 20 },
    { wch: 20 },
    { wch: 40 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, month);
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="task-logs-${month}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
