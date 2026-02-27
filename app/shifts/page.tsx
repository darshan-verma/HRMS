"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Timer, RefreshCw, Plus, Clock, Sunrise, Sunset, Inbox, AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

type Shift = {
  id: string;
  name: string;
  startMinute: number;
  endMinute: number;
  graceMinutes: number;
};

function minutesToTime(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${min.toString().padStart(2, "0")} ${period}`;
}

function minutesToDuration(start: number, end: number) {
  const diff = end > start ? end - start : 1440 - start + end;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function ShiftsPage() {
  const [response, setResponse] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Shift[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const query = useMemo(
    () => new URLSearchParams({ orgId: "seed-org", actorRole: "HR_ADMIN" }).toString(),
    []
  );

  const loadShifts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/v1/shifts?${query}`, { cache: "no-store" });
    if (res.ok) {
      setRows((await res.json()) as Shift[]);
      setError(null);
    } else {
      setError(await res.text());
    }
    setLoading(false);
  }, [query]);

  async function createShift() {
    const res = await fetch("/api/v1/shifts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orgId: "seed-org",
        actorRole: "HR_ADMIN",
        name: "General Shift",
        startMinute: 540,
        endMinute: 1080,
        graceMinutes: 15
      })
    });
    setResponse(await res.text());
    await loadShifts();
  }

  useEffect(() => {
    void loadShifts();
  }, [loadShifts]);

  return (
    <DashboardLayout title="Shift Management" subtitle="Create and manage employee work shifts">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Shifts"
          value={loading ? "--" : `${rows.length}`}
          icon={Timer}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <StatCard
          label="Earliest Start"
          value={loading || rows.length === 0 ? "--" : minutesToTime(Math.min(...rows.map((r) => r.startMinute)))}
          icon={Sunrise}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Latest End"
          value={loading || rows.length === 0 ? "--" : minutesToTime(Math.max(...rows.map((r) => r.endMinute)))}
          icon={Sunset}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
      </div>

      {/* Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Shift Registry</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" onClick={createShift}>
              <Plus size={14} /> Create Shift
            </Button>
            <Button variant="outline" size="sm" onClick={loadShifts}>
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
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No shifts configured"
              description="Create your first shift to define work schedules for employees."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <Table>
                <THead>
                  <tr>
                    <TH>Shift Name</TH>
                    <TH>Start Time</TH>
                    <TH>End Time</TH>
                    <TH>Duration</TH>
                    <TH>Grace Period</TH>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                      <TD className="font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" />
                          {row.name}
                        </div>
                      </TD>
                      <TD>
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          {minutesToTime(row.startMinute)}
                        </span>
                      </TD>
                      <TD>
                        <span className="rounded bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                          {minutesToTime(row.endMinute)}
                        </span>
                      </TD>
                      <TD className="font-medium">{minutesToDuration(row.startMinute, row.endMinute)}</TD>
                      <TD>
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {row.graceMinutes} min
                        </span>
                      </TD>
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
