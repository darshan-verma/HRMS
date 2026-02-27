"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, RefreshCw, Plus, CheckCircle2, XCircle, AlertCircle, Inbox } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

type AttendanceRow = {
  id: string;
  attendanceDate: string;
  status: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  employee?: { fullName: string; employeeCode: string };
};

const statusBadge: Record<string, "success" | "danger" | "warning" | "info"> = {
  PRESENT: "success",
  ABSENT: "danger",
  LATE: "warning",
  HALF_DAY: "info"
};

export default function AttendanceUiPage() {
  const [response, setResponse] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fromDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString();
  }, []);
  const toDate = useMemo(() => new Date().toISOString(), []);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      orgId: "seed-org",
      actorRole: "HR_ADMIN",
      from: fromDate,
      to: toDate,
      page: "1",
      pageSize: "20"
    });
    const res = await fetch(`/api/v1/attendance?${qs.toString()}`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { items: AttendanceRow[] };
      setRows(data.items ?? []);
      setError(null);
    } else {
      setError(await res.text());
    }
    setLoading(false);
  }, [fromDate, toDate]);

  async function markPresent() {
    const res = await fetch("/api/v1/attendance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orgId: "seed-org",
        actorRole: "HR_ADMIN",
        employeeId: "replace-employee-id",
        attendanceDate: new Date().toISOString(),
        status: "PRESENT"
      })
    });
    setResponse(await res.text());
    await loadAttendance();
  }

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  const presentCount = rows.filter((r) => r.status === "PRESENT").length;
  const absentCount = rows.filter((r) => r.status === "ABSENT").length;
  const lateCount = rows.filter((r) => r.status === "LATE").length;

  return (
    <DashboardLayout title="Attendance" subtitle="Track and manage daily employee attendance">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Records"
          value={loading ? "--" : `${rows.length}`}
          icon={Clock}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <StatCard
          label="Present"
          value={loading ? "--" : `${presentCount}`}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Absent"
          value={loading ? "--" : `${absentCount}`}
          icon={XCircle}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
        />
        <StatCard
          label="Late"
          value={loading ? "--" : `${lateCount}`}
          icon={AlertCircle}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" onClick={markPresent}>
              <Plus size={14} /> Mark Present
            </Button>
            <Button variant="outline" size="sm" onClick={loadAttendance}>
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {response && (
            <pre className="mb-4 overflow-auto rounded-lg border border-slate-200 bg-slate-900 p-4 text-xs text-slate-100">
              {response}
            </pre>
          )}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No attendance records"
              description="No attendance data found for the current period. Mark attendance to get started."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <Table>
                <THead>
                  <tr>
                    <TH>Date</TH>
                    <TH>Employee</TH>
                    <TH>Code</TH>
                    <TH>Status</TH>
                    <TH>Check In</TH>
                    <TH>Check Out</TH>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                      <TD className="font-medium">{new Date(row.attendanceDate).toLocaleDateString()}</TD>
                      <TD>{row.employee?.fullName ?? "-"}</TD>
                      <TD>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">
                          {row.employee?.employeeCode ?? "-"}
                        </span>
                      </TD>
                      <TD>
                        <Badge variant={statusBadge[row.status] ?? "outline"}>{row.status}</Badge>
                      </TD>
                      <TD>{row.checkInAt ? new Date(row.checkInAt).toLocaleTimeString() : "-"}</TD>
                      <TD>{row.checkOutAt ? new Date(row.checkOutAt).toLocaleTimeString() : "-"}</TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
